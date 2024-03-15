import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postNew(request, response) {
    const { token } = request.headers;
    if (!token) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    const {
      name,
      type,
      parentId = '0',
      isPublic = false,
      data,
    } = request.body;

    if (!name) {
      return response.status(400).send({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).send({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).send({ error: 'Missing data' });
    }

    if (parentId !== '0') {
      const parentFile = await dbClient.filesCollection.findOne(
	{ _id: ObjectId(parentId) }
      );
      if (!parentFile) {
        return response.status(400).send({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return response.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const fileDoc = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const result = await dbClient.filesCollection.insertOne(fileDoc);
      fileDoc._id = result.insertedId;
      return response.status(201).send(fileDoc);
    }

    const storingFolder = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(storingFolder)) {
      fs.mkdirSync(storingFolder, { recursive: true });
    }
    const fileUUID = uuidv4();
    const filePath = `${storingFolder}/${fileUUID}`;
    const fileData = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, fileData);

    fileDoc.localPath = filePath;
    const result = await dbClient.filesCollection.insertOne(fileDoc);
    fileDoc._id = result.insertedId;

    return response.status(201).send(fileDoc);
  }
}

export default FilesController;

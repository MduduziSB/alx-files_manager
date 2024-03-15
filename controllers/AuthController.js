import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async connect(request, response) {
    const auth = request.headers.authorization.split(' ')[1];
    if (!auth) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const credentials = Buffer.from(auth, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');
    const user = await dbClient.usersCollection.findOne(
      { email, password: sha1(password) }
    );
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 86400);
    return response.status(200).send({ token });
  }

  static async disconnect(request, response) {
    const { token } = request.headers;
    if (!token) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${token}`);
    return response.status(204).send();
  }
}

export default AuthController;

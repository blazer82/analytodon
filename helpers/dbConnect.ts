import mongoose, {Mongoose} from 'mongoose';
import getConfig from 'next/config';

const {serverRuntimeConfig} = getConfig();

type DbConnect = () => Promise<void | Mongoose>;
const dbConnect: DbConnect = async () => {
    // check if we have a connection to the database or if it's currently
    // connecting or disconnecting (readyState 1, 2 and 3)
    if (mongoose.connection.readyState >= 1) {
        return mongoose;
    }
    return mongoose.connect(serverRuntimeConfig.mongodbUri, serverRuntimeConfig.mongodbOpts);
};

export default dbConnect;

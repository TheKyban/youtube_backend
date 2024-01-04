import dotEnv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { PORT } from "./constants.js";

dotEnv.config({
    path: "./env",
});

connectDB()
    .then(() => {
        app.listen(PORT, () =>
            console.log(`Server is running at port : ${PORT}`),
        );
    })
    .catch((err) => {
        console.log("MONGODB CONNECTION FAILED !!! ", err);
    });

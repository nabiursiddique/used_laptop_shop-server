const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7t8vw3l.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const userCollection = client.db('usedLaptopShop').collection('users');
        const productCollection = client.db('usedLaptopShop').collection('products');

        // saving users information in the database
        app.post('/allUsers', async(req,res)=>{
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Getting the saved user information form database
        app.get('/allUsers', async(req,res)=>{
            const query ={};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        // Saving product information in the database
        app.post('/product', async(req,res)=>{
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

    } finally {

    }
}
run().catch(console.dir);




app.get('/', async (req, res) => {
    res.send("server is running");
});

app.listen(port, () => console.log(`used laptop server is running on port ${port}`));
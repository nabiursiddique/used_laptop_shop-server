const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const bookingCollection = client.db('usedLaptopShop').collection('bookings');

        // saving users information in the db
        app.post('/allUsers', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Getting the saved user information form db
        app.get('/allUsers', async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        // Getting user role
        app.get('/allUsersRole', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = userCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        });

        // Getting all the buyers
        app.get('/allBuyers', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const buyers = await userCollection.find(query).toArray();
            res.send(buyers);
        });

        // Getting all the sellers
        app.get('/allSellers', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const sellers = await userCollection.find(query).toArray();
            res.send(sellers);
        })

        // Deleting user from the db
        app.delete('/allUsers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        // Saving product information in the db
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        // Getting all the products from db without booked products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const allProducts = await cursor.toArray();
            const products = allProducts.filter(product => !product.booked);
            res.send(products);
        });

        // Getting user specific products from db
        app.get('/userProducts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = productCollection.find(query);
            const userProducts = await cursor.toArray();
            res.send(userProducts);
        });


        // Deleting a product from db (we will use this api two time one for admin all product and another for individual seller.)
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

        // saving users booking information in the db
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        // Getting user specific bookings 
        app.get('/booking', async(req,res)=>{
            const email = req.query.email;
            const query = {buyerEmail: email};
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        // updating/marking booked product as booked=true
        app.put('/booking/:id', async(req,res)=>{
            const productId = req.params.id;
            const product = req.body;
            const filter = {_id: new ObjectId(productId)};
            const options = { upsert: true };
            const updateDoc ={
                $set: product
            }
            const result =await productCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        }); 

    }
    finally {

    }
}
run().catch(console.dir);




app.get('/', async (req, res) => {
    res.send("server is running");
});

app.listen(port, () => console.log(`used laptop server is running on port ${port}`));
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

// middleware for verify JWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" })
        }
        req.decoded = decoded
        next();
    })
};

async function run() {
    try {
        const userCollection = client.db('usedLaptopShop').collection('users');
        const productCollection = client.db('usedLaptopShop').collection('products');
        const bookingCollection = client.db('usedLaptopShop').collection('bookings');
        const blogCollection = client.db('usedLaptopShop').collection('blogContents')
        const paymentCollection = client.db('usedLaptopShop').collection('payments');

        // JWT
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "10h" });
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' });
        });

        // saving users information in the db
        app.post('/allUsers', async (req, res) => {
            const user = req.body;
            const query = {
                name: user.name,
                email: user.email
            }
            const alreadyCreatedUsers = await userCollection.find(query).toArray();

            if (alreadyCreatedUsers.length) {
                res.send(alreadyCreatedUsers);
                return;
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Getting the saved user information form db
        app.get('/allUsers', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        // Getting verified users
        app.get('/verifiedUsers', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // Getting user role
        app.get('/allUsersRole', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = userCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        });

        // API for Changing the user role to admin
        app.patch('/allUsers', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: "Admin"
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        // API for making the seller verified and store in db
        app.patch('/verifySeller', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    verified: true
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });


        // Getting all the buyers
        app.get('/allBuyers', verifyJWT, async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const buyers = await userCollection.find(query).toArray();
            res.send(buyers);
        });

        // Getting all the sellers
        app.get('/allSellers', verifyJWT, async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const sellers = await userCollection.find(query).toArray();
            res.send(sellers);
        });

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
        app.get('/userProducts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                res.status(403).send({ message: "forbidden access" })
            }
            const query = { email: email };
            const cursor = productCollection.find(query);
            const userProducts = await cursor.toArray();
            res.send(userProducts);
        });


        // Deleting a product from db
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
        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                res.status(403).send({ message: "forbidden access" })
            }
            const query = { buyerEmail: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

        // Showing the buyer information in the seller dashboard
        app.get('/buyerInfo', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                res.status(403).send({ message: "forbidden access" })
            }
            const query = { sellerEmail: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

        // Getting product for payment
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productId: id };
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })

        // updating/marking booked product as booked=true
        app.put('/booking/:id', async (req, res) => {
            const productId = req.params.id;
            const product = req.body;
            const filter = { _id: new ObjectId(productId) };
            const options = { upsert: true };
            const updateDoc = {
                $set: product
            }
            const result = await productCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        // Blog contents
        app.get('/blogContents', async (req, res) => {
            const query = {};
            const cursor = blogCollection.find(query);
            const blogs = await cursor.toArray();
            res.send(blogs);
        });

        app.post('/blogContents', async (req, res) => {
            const query = req.body;
            const result = await blogCollection.insertOne(query);
            res.send(result);

        });

        app.delete('/blogContents/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogCollection.deleteOne(query);
            res.send(result);
        });

        // Stripe payment api
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.productPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // Saving payment information in the database
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const productId = payment.productId;
            const filter = { productId: productId }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateOne(filter, updateDoc);
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
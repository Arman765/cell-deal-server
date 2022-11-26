const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.upeallf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const categoryCollection = client.db("cellsaleDB").collection("categories");
    const bookingsCollection = client.db("cellsaleDB").collection("bookings");
    const usersCollection = client.db("cellsaleDB").collection("users");

    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoryCollection.find(query).toArray();
      res.send(categories);
    });
    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const category = await categoryCollection.findOne(filter);
      res.send(category);
    });
    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
  } finally {
  }
};
run().catch((error) => {
  console.log(error);
});

app.get("/", async (req, res) => {
  res.send("SERVER is running");
});

app.listen(port, () => {
  console.log("Server running in port", port);
});

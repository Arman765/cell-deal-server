const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");
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

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const run = async () => {
  try {
    const categoryCollection = client.db("cellsaleDB").collection("categories");
    const bookingsCollection = client.db("cellsaleDB").collection("bookings");
    const usersCollection = client.db("cellsaleDB").collection("users");
    const sellersCollection = client.db("cellsaleDB").collection("sellers");
    const productsCollection = client.db("cellsaleDB").collection("products");
    const paymentsCollection = client.db("cellsaleDB").collection("payments");

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

    app.get("/categoriesname", async (req, res) => {
      const query = {};
      const result = await categoryCollection
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    // app.put("/categories/:name", async (req, res) => {
    //   const category = req.params.name;
    //   const query = { name: category };
    //   const product = req.body;
    //   const option = { upsert: true };
    //   const updatedUser = {
    //     $set: {
    //       products: product,
    //     },
    //   };
    //   const result = await categoryCollection.insertOne(query);
    //   // console.log(categories.products);

    //   // console.log(product);
    //   // console.log(product);
    //   // const query = {categories};
    //   // const categories = await categoryCollection.insertOne(product);
    //   res.send(result);
    // });

    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.rePrice;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const seller = await sellersCollection.findOne(query);
      if (user || seller) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // konokichu update korte hoile (eiikhane admin role update korbo)

    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/sellers", async (req, res) => {
      const query = {};
      const users = await sellersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/sellers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await sellersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    app.post("/sellers", async (req, res) => {
      const seller = req.body;
      const result = await sellersCollection.insertOne(seller);
      res.send(result);
    });

    app.delete("/sellers/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const result = await sellersCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.put("/products/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: "true",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
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

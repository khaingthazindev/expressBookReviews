const express = require("express");
const jwt = require("jsonwebtoken");
let books = require("./booksdb.js");
const regd_users = express.Router();
const fs = require("fs").promises;

async function getAuthUsers() {
  const data = await fs.readFile("./router/usersdb.json", "utf8");
  if (data) {
    return JSON.parse(data);
  }
  return [];
}

const isValid = async (username) => {
  let users = await getAuthUsers();
  return users.find((u) => u.username === username);
};

const authenticatedUser = async (username, password) => {
  let users = await getAuthUsers();
  return users.find((u) => u.username === username && u.password === password);
};

regd_users.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const validUser = await isValid(username);
  const user = await authenticatedUser(username, password);

  if (!(validUser && user)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = jwt.sign({ body: user.id }, "secret_key");

  req.session.authorization = {
    accessToken,
  };

  return res.status(200).json({
    message: "Login successful",
    token: accessToken,
  });
});

regd_users.put("/auth/review/:isbn", (req, res) => {
  let isbn = req.params.isbn;
  let reviewText = req.body.review;
  let authId = req.user.body;
  let newReview = {
    user_id: authId,
    text: reviewText,
  };
  for (let i in books) {
    if (i === isbn) {
      books[i].reviews[Object.keys(books[i].reviews).length + 1] = newReview;
      res.json(books[i].reviews);
    }
  }
});

regd_users.put("/auth/book/:isbn/review/:id", (req, res) => {
  let isbn = req.params.isbn;
  let id = req.params.id;
  let reviewText = req.body.review;
  let authId = req.user.body;
  for (let i in books) {
    if (i === isbn) {
      if (books[i].reviews[id]) {
        if (books[i].reviews[id].user_id !== authId) {
          res.status(403).json({ message: "No permission." });
        }
        books[i].reviews[id].text = reviewText;
        res.json(books[i].reviews);
      } else {
        res.status(404).json({ message: "Review not found" });
      }
    }
  }
});

regd_users.delete("/auth/book/:isbn/review/:id", (req, res) => {
  let isbn = req.params.isbn;
  let id = req.params.id;
  let authId = req.user.body;
  for (let i in books) {
    if (i === isbn) {
      if (books[i].reviews[id].user_id !== authId) {
        res.status(403).json({ message: "No permission." });
      }
      let reviews = books[i].reviews;
      if (!reviews[id]) {
        res.status(404).json({ message: "Review not found" });
      }

      delete reviews[id];

      res.json({ message: "Review deleted" });
    }
  }
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.getAuthUsers = getAuthUsers;

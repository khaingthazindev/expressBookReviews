const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const books = require("./booksdb.js");
const getAuthUsers = require("./auth_users.js").getAuthUsers;
const public_users = express.Router();

public_users.post("/register", async (req, res) => {
  try {
    let users = await getAuthUsers();
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password required" });

    const existingUser = users.find((u) => u.username === username);
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const newUser = { id: users.length + 1, username, password };
    users.push(newUser);

    fs.writeFileSync("./router/usersdb.json", JSON.stringify(users, null, 4));
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error registering user" });
  }
});

function getAllBooks(callback) {
  setTimeout(() => {
    callback(null, books);
  }, 100);
}

public_users.get("/", (req, res) => {
  getAllBooks((err, allBooks) => {
    if (err) return res.status(500).json({ message: "Error retrieving books" });
    return res.status(200).json({ data: allBooks });
  });
});

function getBookByISBN(isbn) {
  return new Promise((resolve, reject) => {
    if (books[isbn]) resolve(books[isbn]);
    else reject(`Book with ISBN ${isbn} not found`);
  });
}

function getBooksByAuthor(author) {
  return new Promise((resolve, reject) => {
    const result = {};
    for (let isbn in books) {
      if (books[isbn].author === author) result[isbn] = books[isbn];
    }
    Object.keys(result).length > 0
      ? resolve(result)
      : reject(`Author "${author}" not found`);
  });
}

function getBooksByTitle(title) {
  return new Promise((resolve, reject) => {
    const result = {};
    for (let isbn in books) {
      if (books[isbn].title === title) result[isbn] = books[isbn];
    }
    Object.keys(result).length > 0
      ? resolve(result)
      : reject(`Title "${title}" not found`);
  });
}

public_users.get("/isbn/:isbn", async (req, res) => {
  const isbn = req.params.isbn;
  try {
    const book = await getBookByISBN(isbn);
    res.status(200).json({ data: book });
  } catch (err) {
    res.status(404).json({ message: err });
  }
});

public_users.get("/author/:author", async (req, res) => {
  const author = req.params.author;
  try {
    const booksByAuthor = await getBooksByAuthor(author);
    res.status(200).json({ data: booksByAuthor });
  } catch (err) {
    res.status(404).json({ message: err });
  }
});

public_users.get("/title/:title", async (req, res) => {
  const title = req.params.title;
  try {
    const booksByTitle = await getBooksByTitle(title);
    res.status(200).json({ data: booksByTitle });
  } catch (err) {
    res.status(404).json({ message: err });
  }
});

function getUserIdFromSession(req) {
  const token = req.session?.authorization?.accessToken;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, "secret_key");
    return decoded.body;
  } catch {
    return null;
  }
}

// CREATE/ADD review
public_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const reviewText = req.body.review;
  const userId = getUserIdFromSession(req);
  if (!userId) return res.status(401).json({ message: "Login required" });

  if (!books[isbn]) return res.status(404).json({ message: "Book not found" });

  const reviewId = Object.keys(books[isbn].reviews).length + 1;
  books[isbn].reviews[reviewId] = { user_id: userId, text: reviewText };

  res.status(200).json({
    message: `Review added successfully for ISBN ${isbn}.`,
    reviews: books[isbn].reviews,
  });
});

public_users.put("/auth/review/:isbn/:id", (req, res) => {
  const { isbn, id } = req.params;
  const reviewText = req.body.review;
  const userId = getUserIdFromSession(req);
  if (!userId) return res.status(401).json({ message: "Login required" });

  if (!books[isbn] || !books[isbn].reviews[id])
    return res.status(404).json({ message: "Review not found" });

  if (books[isbn].reviews[id].user_id !== userId)
    return res
      .status(403)
      .json({ message: "No permission to update this review" });

  books[isbn].reviews[id].text = reviewText;
  res
    .status(200)
    .json({ message: "Review updated", reviews: books[isbn].reviews });
});

public_users.delete("/auth/review/:isbn/:id", (req, res) => {
  const { isbn, id } = req.params;
  const userId = getUserIdFromSession(req);
  if (!userId) return res.status(401).json({ message: "Login required" });

  if (!books[isbn] || !books[isbn].reviews[id])
    return res.status(404).json({ message: "Review not found" });

  if (books[isbn].reviews[id].user_id !== userId)
    return res
      .status(403)
      .json({ message: "No permission to delete this review" });

  delete books[isbn].reviews[id];
  res.status(200).json({ message: `Review for ISBN ${isbn} was deleted` });
});

public_users.get("/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  if (!books[isbn] || Object.keys(books[isbn].reviews).length === 0) {
    return res.status(404).json({ message: "Review not found" });
  }
  res.status(200).json({ review: books[isbn].reviews });
});

module.exports.general = public_users;

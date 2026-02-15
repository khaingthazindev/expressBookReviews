const express = require("express");
const fs = require("fs");
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let getAuthUsers = require("./auth_users.js").getAuthUsers;
const public_users = express.Router();

public_users.post("/register", async (req, res) => {
  let users = await getAuthUsers();
  let username = req.body.username;
  let password = req.body.password;
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  let newUser = {
    id: users.length + 1,
    username: username,
    password: password,
  };
  users = [...users, newUser];

  fs.writeFileSync("./router/usersdb.json", JSON.stringify(users, null, 4));

  res.status(201).json({ message: "User registered successfully" });
});

function getAllBooks(callback) {
  setTimeout(() => {
    callback(null, books);
  }, 100);
}

public_users.get("/", (req, res) => {
  getAllBooks((err, allBooks) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving books" });
    }
    return res.status(200).json({ data: allBooks });
  });
});

function getBookByISBN(isbn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (books[isbn]) resolve(books[isbn]);
      else reject(`Book with ISBN ${isbn} not found`);
    }, 100);
  });
}

public_users.get("/isbn/:isbn", async (req, res) => {
  let isbn = req.params.isbn;
  try {
    const book = await getBookByISBN(isbn);
    res.status(200).json({ data: book });
  } catch (err) {
    res.status(404).json({ message: err });
  }
});

function getBooksByAuthor(author) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const result = {};
      for (let isbn in books) {
        if (books[isbn].author === author) {
          result[isbn] = books[isbn];
        }
      }
      Object.keys(result).length > 0
        ? resolve(result)
        : reject("Author not found");
    }, 100);
  });
}

function getBooksByTitle(title) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const result = {};
      for (let isbn in books) {
        if (books[isbn].title === title) {
          result[isbn] = books[isbn];
        }
      }
      Object.keys(result).length > 0
        ? resolve(result)
        : reject("Title not found");
    }, 100);
  });
}

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

public_users.get("/review/:isbn", function (req, res) {
  let isbn = req.params.isbn;
  let result = {};

  for (let i in books) {
    if (i === isbn) {
      result = books[i].reviews;
    }
  }
  if (Object.keys(result).length === 0) {
    return res.status(404).json({ message: "Review not found" });
  }
  return res.status(200).json({ review: result });
});

module.exports.general = public_users;

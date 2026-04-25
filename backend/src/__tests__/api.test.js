import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../database/db.js", () => ({ query: jest.fn() }));
jest.mock("../database/init.js", () => ({ initDatabase: jest.fn() }));
jest.mock("puppeteer", () => ({
  launch: jest.fn().mockResolvedValue({ close: jest.fn().mockResolvedValue() }),
}));
jest.mock("../service/scraper.js", () => ({
  scrapeRestaurant: jest.fn().mockResolvedValue([]),
  RESTAURANTS: [],
}));
jest.mock("../service/menuService.js", () => ({
  getAllMenus: jest.fn().mockResolvedValue([]),
  saveMenus: jest.fn().mockResolvedValue(),
  deleteMenu: jest.fn().mockResolvedValue(),
}));
jest.mock("../service/commentsService.js", () => ({
  getCommentsByRestaurant: jest.fn().mockResolvedValue([]),
  addComment: jest.fn().mockResolvedValue(),
  deleteComment: jest.fn().mockResolvedValue(),
  getAllComments: jest.fn().mockResolvedValue([]),
}));
jest.mock("../service/restaurantService.js", () => ({
  getAllRestaurants: jest.fn().mockResolvedValue([]),
  updateRestaurant: jest.fn().mockResolvedValue(),
  deleteRestaurant: jest.fn().mockResolvedValue(),
}));

import app from "../index.js";

const adminToken = jwt.sign(
  { username: "testadmin", admin: true },
  process.env.JWT_SECRET
);
const authHeader = `Bearer ${adminToken}`;

describe("Health", () => {
  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Menus", () => {
  test("GET /api/menus returns array", async () => {
    const res = await request(app).get("/api/menus");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("DELETE /api/menus/:id requires auth", async () => {
    const res = await request(app).delete("/api/menus/1");
    expect(res.status).toBe(401);
  });

  test("DELETE /api/menus/:id succeeds with token", async () => {
    const res = await request(app)
      .delete("/api/menus/1")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("Auth", () => {
  test("POST /api/login with valid credentials returns token", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testadmin", password: "testpassword" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("POST /api/login with wrong password returns 401", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testadmin", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  test("POST /api/login with missing fields returns 400", async () => {
    const res = await request(app).post("/api/login").send({ username: "testadmin" });
    expect(res.status).toBe(400);
  });

  test("POST /api/logout requires auth", async () => {
    const res = await request(app).post("/api/logout");
    expect(res.status).toBe(401);
  });

  test("POST /api/logout succeeds with token", async () => {
    const res = await request(app)
      .post("/api/logout")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("Comments", () => {
  test("GET /api/comments/:restaurantId returns array", async () => {
    const res = await request(app).get("/api/comments/1");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/comments adds a comment", async () => {
    const res = await request(app)
      .post("/api/comments")
      .send({ restaurantId: 1, text: "Great food!" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("POST /api/comments with missing fields returns 400", async () => {
    const res = await request(app).post("/api/comments").send({ restaurantId: 1 });
    expect(res.status).toBe(400);
  });

  test("DELETE /api/comments/:id requires auth", async () => {
    const res = await request(app).delete("/api/comments/1");
    expect(res.status).toBe(401);
  });

  test("DELETE /api/comments/:id succeeds with token", async () => {
    const res = await request(app)
      .delete("/api/comments/1")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("GET /api/admin/comments requires auth", async () => {
    const res = await request(app).get("/api/admin/comments");
    expect(res.status).toBe(401);
  });

  test("GET /api/admin/comments returns array with token", async () => {
    const res = await request(app)
      .get("/api/admin/comments")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Restaurants", () => {
  test("GET /api/admin/restaurants requires auth", async () => {
    const res = await request(app).get("/api/admin/restaurants");
    expect(res.status).toBe(401);
  });

  test("GET /api/admin/restaurants returns array with token", async () => {
    const res = await request(app)
      .get("/api/admin/restaurants")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("PUT /api/restaurants/:id requires auth", async () => {
    const res = await request(app)
      .put("/api/restaurants/1")
      .send({ name: "New Name", menu_url: "https://example.com" });
    expect(res.status).toBe(401);
  });

  test("PUT /api/restaurants/:id succeeds with token", async () => {
    const res = await request(app)
      .put("/api/restaurants/1")
      .set("Authorization", authHeader)
      .send({ name: "New Name", menu_url: "https://example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("DELETE /api/restaurants/:id requires auth", async () => {
    const res = await request(app).delete("/api/restaurants/1");
    expect(res.status).toBe(401);
  });

  test("DELETE /api/restaurants/:id succeeds with token", async () => {
    const res = await request(app)
      .delete("/api/restaurants/1")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

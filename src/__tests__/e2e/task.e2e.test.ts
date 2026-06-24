import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should return 400 when title is missing", async () => {
			const res = await request(app).post("/api/tasks").send({ description: "No title" });

			expect(res.status).toBe(400);
			expect(res.body).toEqual({
				error: "Title is required and must be a non-empty string",
			});
		});
	});

	describe("GET /api/tasks", () => {
		it("should return all tasks", async () => {
			await request(app).post("/api/tasks").send({ title: "Task A", description: "A" });
			await request(app).post("/api/tasks").send({ title: "Task B", description: "B" });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
			expect(res.body[0].title).toBe("Task B");
			expect(res.body[1].title).toBe("Task A");
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return one task by id", async () => {
			const created = await request(app)
				.post("/api/tasks")
				.send({ title: "Fetch me", description: "single" });

			const res = await request(app).get(`/api/tasks/${created.body.id}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(created.body.id);
			expect(res.body.title).toBe("Fetch me");
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).get("/api/tasks/999999");

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update an existing task", async () => {
			const created = await request(app)
				.post("/api/tasks")
				.send({ title: "To update", description: "before" });

			const res = await request(app)
				.put(`/api/tasks/${created.body.id}`)
				.send({ title: "Updated", description: "after", completed: true });

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("Updated");
			expect(res.body.description).toBe("after");
			expect(res.body.completed).toBe(true);
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).put("/api/tasks/999999").send({ title: "Updated" });

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete an existing task", async () => {
			const created = await request(app)
				.post("/api/tasks")
				.send({ title: "To delete", description: "delete me" });

			const delRes = await request(app).delete(`/api/tasks/${created.body.id}`);
			expect(delRes.status).toBe(204);

			const getRes = await request(app).get(`/api/tasks/${created.body.id}`);
			expect(getRes.status).toBe(404);
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).delete("/api/tasks/999999");

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});
});

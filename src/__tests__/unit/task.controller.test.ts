import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock the service module
vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	} as unknown as Response;
	return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
	return {
		params: {},
		body: {},
		query: {},
		...overrides,
	} as unknown as Request;
}

describe("TaskController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllTasks", () => {
		it("should return 200 with all tasks", async () => {
			const tasks = [mockTask];
			mockService.findAll.mockResolvedValue(tasks);
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(tasks);
		});

		it("should return 500 when service throws", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockService.findAll.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
			consoleErrorSpy.mockRestore();
		});
	});

	describe("getTaskById", () => {
		it("should return 400 when id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
			expect(mockService.findById).not.toHaveBeenCalled();
		});

		it("should return 404 when task does not exist", async () => {
			mockService.findById.mockResolvedValue(null);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("should return 200 with the task when found", async () => {
			mockService.findById.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("should return 500 when service throws", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockService.findById.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch task" });
			consoleErrorSpy.mockRestore();
		});
	});

	describe("createTask", () => {
		it("should return 400 when title is missing", async () => {
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: "Title is required and must be a non-empty string",
			});
			expect(mockService.create).not.toHaveBeenCalled();
		});

		it("should create a task and return 201", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "  Test Task  ", description: "Test description" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Test Task",
				description: "Test description",
			});
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("should pass undefined description when omitted", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "Test Task" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Test Task",
				description: undefined,
			});
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("should return 500 when service throws", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockService.create.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest({
				body: { title: "Test Task", description: "Test description" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
			consoleErrorSpy.mockRestore();
		});
	});

	describe("updateTask", () => {
		it("should return 400 when id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
			expect(mockService.update).not.toHaveBeenCalled();
		});

		it("should update a task and return 200", async () => {
			const updatedTask = { ...mockTask, completed: true };
			mockService.update.mockResolvedValue(updatedTask);
			const req = createMockRequest({
				params: { id: "1" },
				body: { completed: true },
			});
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(mockService.update).toHaveBeenCalledWith(1, {
				title: undefined,
				description: undefined,
				completed: true,
			});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedTask);
		});

		it("should return 404 when service throws Task not found", async () => {
			mockService.update.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "1" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("should return 500 when service throws another error", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockService.update.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest({ params: { id: "1" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to update task" });
			consoleErrorSpy.mockRestore();
		});
	});

	describe("deleteTask", () => {
		it("should return 400 when id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
			expect(mockService.remove).not.toHaveBeenCalled();
		});

		it("should delete a task and return 204", async () => {
			mockService.remove.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(mockService.remove).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
		});

		it("should return 404 when service throws Task not found", async () => {
			mockService.remove.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("should return 500 when service throws another error", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockService.remove.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to delete task" });
			consoleErrorSpy.mockRestore();
		});
	});
});

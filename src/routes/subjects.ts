import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router();

const MAX_LIMIT = 100;

// Get all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { search, department } = req.query;

    // Safely parse and validate pagination parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    // Parse page parameter
    let currentPage = 1;
    if (pageParam) {
      const pageStr = Array.isArray(pageParam) ? pageParam[0] : pageParam;
      const parsedPage = Number(pageStr);
      if (
        Number.isFinite(parsedPage) &&
        Number.isInteger(parsedPage) &&
        parsedPage > 0
      ) {
        currentPage = parsedPage;
      }
    }

    // Parse limit parameter with hard cap
    let limitPerPage = 10;
    if (limitParam) {
      const limitStr = Array.isArray(limitParam) ? limitParam[0] : limitParam;
      const parsedLimit = Number(limitStr);
      if (
        Number.isFinite(parsedLimit) &&
        Number.isInteger(parsedLimit) &&
        parsedLimit > 0
      ) {
        limitPerPage = Math.min(MAX_LIMIT, parsedLimit);
      }
    }

    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // if search query exists, filter by subject name OR subject code
    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`),
        ),
      );
    }

    // if department filter exists, match by department name
    if (department) {
      filterConditions.push(ilike(departments.name, `%${department}%`));
    }

    // combine all filters using AND if any exist
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`GET /subjects error: ${e}`);
    res.status(500).json({ error: "failed to get subjects" });
  }
});

export default router;

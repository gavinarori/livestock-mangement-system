import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth/utils";
import { SignupSchema } from "@/lib/validations";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validated = SignupSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const orgSlug =
      validated.organizationSlug || validated.email.split("@")[0];

    const organization = await prisma.organization.create({
      data: {
        name: validated.organizationName || "My Farm",
        slug: `${orgSlug}-${Date.now()}`,
        description: "Enterprise livestock management system",
      },
    });

    const hashedPassword = await hashPassword(validated.password);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name,
        role: UserRole.ADMIN,
        organizationId: organization.id,
        isActive: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      role: user.role,
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        token,
        user,
        organization,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[signup error]", error);

    // Zod validation error
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors?.[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    // Prisma or unexpected error
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
import type { APIRoute } from "astro";
import { appointmentService } from "../../../lib/services/appointment.service";

export const GET: APIRoute = async ({ request }) => {
  try {
    // Parse query parameters from URL
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate query parameters using the service
    const validationResult = appointmentService.validateAppointmentListRequest(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: validationResult.error.errors,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get appointments using the service
    try {
      const result = await appointmentService.getAppointments(validationResult.data);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            appointments: result.appointments,
            pagination: {
              page: result.pagination.page,
              limit: result.pagination.limit,
              total: result.pagination.total,
              total_pages: result.pagination.total_pages,
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (serviceError: unknown) {
      console.error("Service error:", serviceError);

      const errorMessage = serviceError instanceof Error ? serviceError.message : "Unknown error";

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Failed to fetch appointments",
            code: "SERVICE_ERROR",
            details: errorMessage,
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: unknown) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

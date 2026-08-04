import { getSql } from "../server/db.js";
import { getActor } from "../server/rbac.js";
import { isSameOriginRequest } from "../server/auth.js";
import { errorResponse, getRequestId, json } from "../server/http.js";

const statuses = new Set(["ready", "issued"]);
const sources = new Set(["manual", "zoommer.ge"]);
const personalNumberPattern = /^\d{11}$/;

function clean(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function optional(value, max = 240) {
  const result = clean(value, max);
  return result || null;
}

function mapBranch(row) {
  return {
    id: row.id,
    code: row.external_code,
    name: row.name,
    city: row.city,
    address: row.address,
    phone: row.phone,
    type: row.branch_type,
  };
}

function mapPickup(row) {
  return {
    id: row.id,
    orderNumber: row.external_order_id,
    employeeExternalId: row.processor_external_id,
    employeeName: row.processor_name,
    paymentMethod: row.payment_method,
    customerName: row.customer_full_name,
    customerPersonalNumber: row.customer_personal_number,
    alternateRecipientName: row.alternate_recipient_name,
    alternateRecipientPersonalNumber: row.alternate_recipient_personal_number,
    branchId: row.branch_id,
    branchName: row.branch_name,
    branchCity: row.branch_city,
    productName: row.product_name,
    quantity: row.quantity,
    serialNumber: row.serial_number,
    issuedAt: row.issued_at,
    status: row.status,
    comment: row.comment,
    price: Number(row.price),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function accessFor(sql, actor) {
  if (!actor?.id || actor.mustChangePassword) return null;
  const grants = await sql`
    select branch_id, access_scope
    from user_branch_access
    where user_id = ${actor.id}
  `;
  if (!grants.length) return null;
  return {
    all: grants.some((grant) => grant.access_scope === "all"),
    branchIds: grants.filter((grant) => grant.branch_id).map((grant) => grant.branch_id),
  };
}

function canUseBranch(access, branchId) {
  return Boolean(access && (access.all || access.branchIds.includes(branchId)));
}

function validate(body, actor, existing = null) {
  const status = clean(body.status ?? existing?.status, 16);
  const source = clean(body.source ?? existing?.source ?? "manual", 24);
  const quantity = Number(body.quantity ?? existing?.quantity);
  const price = Number(body.price ?? existing?.price);
  const alternateName = optional(
    body.alternateRecipientName ?? existing?.alternate_recipient_name,
    160,
  );
  const alternatePersonalNumber = optional(
    body.alternateRecipientPersonalNumber ?? existing?.alternate_recipient_personal_number,
    11,
  );
  const issuedAtInput = body.issuedAt ?? existing?.issued_at ?? null;
  let issuedAt = issuedAtInput ? new Date(issuedAtInput) : null;
  if (status === "issued" && (!issuedAt || Number.isNaN(issuedAt.getTime()))) {
    issuedAt = new Date();
  }
  if (status === "ready") issuedAt = null;

  const data = {
    orderNumber: clean(body.orderNumber ?? existing?.external_order_id, 80),
    employeeExternalId: optional(body.employeeExternalId ?? existing?.processor_external_id, 120),
    employeeName: clean(body.employeeName ?? existing?.processor_name ?? actor.name, 160),
    paymentMethod: clean(body.paymentMethod ?? existing?.payment_method, 80),
    customerName: clean(body.customerName ?? existing?.customer_full_name, 160),
    customerPersonalNumber: clean(
      body.customerPersonalNumber ?? existing?.customer_personal_number,
      11,
    ),
    alternateName,
    alternatePersonalNumber,
    branchId: clean(body.branchId ?? existing?.branch_id, 40),
    productName: clean(body.productName ?? existing?.product_name, 260),
    quantity,
    serialNumber: optional(body.serialNumber ?? existing?.serial_number, 240),
    issuedAt: issuedAt && !Number.isNaN(issuedAt.getTime()) ? issuedAt.toISOString() : null,
    status,
    comment: optional(body.comment ?? existing?.comment, 1200),
    price,
    source,
  };

  const fieldErrors = [];
  if (data.orderNumber.length < 2) fieldErrors.push({ field: "orderNumber", message: "შეიყვანეთ ორდერის ნომერი" });
  if (data.employeeName.length < 2) fieldErrors.push({ field: "employeeName", message: "თანამშრომელი სავალდებულოა" });
  if (data.paymentMethod.length < 2) fieldErrors.push({ field: "paymentMethod", message: "აირჩიეთ გადახდის მეთოდი" });
  if (data.customerName.length < 2) fieldErrors.push({ field: "customerName", message: "მომხმარებელი სავალდებულოა" });
  if (!personalNumberPattern.test(data.customerPersonalNumber)) fieldErrors.push({ field: "customerPersonalNumber", message: "პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან" });
  if (Boolean(data.alternateName) !== Boolean(data.alternatePersonalNumber)) fieldErrors.push({ field: "alternateRecipientName", message: "სხვა მიმღების სახელი და პირადი ნომერი ერთად შეავსეთ" });
  if (data.alternatePersonalNumber && !personalNumberPattern.test(data.alternatePersonalNumber)) fieldErrors.push({ field: "alternateRecipientPersonalNumber", message: "სხვა მიმღების პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან" });
  if (!data.branchId) fieldErrors.push({ field: "branchId", message: "აირჩიეთ გამცემი ფილიალი" });
  if (data.productName.length < 2) fieldErrors.push({ field: "productName", message: "პროდუქტი სავალდებულოა" });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) fieldErrors.push({ field: "quantity", message: "რაოდენობა უნდა იყოს 1-დან 1000-მდე" });
  if (!Number.isFinite(price) || price < 0 || price > 9999999999) fieldErrors.push({ field: "price", message: "შეიყვანეთ სწორი ფასი" });
  if (!statuses.has(status)) fieldErrors.push({ field: "status", message: "უცნობი სტატუსი" });
  if (!sources.has(source)) fieldErrors.push({ field: "source", message: "უცნობი წყარო" });
  return { data, fieldErrors };
}

const selection = `
  bp.*,
  rb.name as branch_name,
  rb.city as branch_city
`;

export default {
  async fetch(request) {
    const requestId = getRequestId(request);
    try {
      const sql = getSql();
      const actor = await getActor(request);
      const access = await accessFor(sql, actor);
      if (!access) {
        return errorResponse("BRANCH_ACCESS_REQUIRED", "ფილიალიდან გაცემის მოდულზე წვდომა არ გაქვთ", 403, requestId);
      }

      if (request.method === "GET") {
        const [branches, pickups] = access.all
          ? await Promise.all([
              sql`select * from retail_branches where active = true order by city, name`,
              sql.query(`select ${selection} from branch_pickups bp join retail_branches rb on rb.id = bp.branch_id order by coalesce(bp.issued_at, bp.created_at) desc limit 500`),
            ])
          : await Promise.all([
              sql.query("select * from retail_branches where active = true and id = any($1::uuid[]) order by city, name", [access.branchIds]),
              sql.query(`select ${selection} from branch_pickups bp join retail_branches rb on rb.id = bp.branch_id where bp.branch_id = any($1::uuid[]) order by coalesce(bp.issued_at, bp.created_at) desc limit 500`, [access.branchIds]),
            ]);
        return json(
          {
            branches: branches.map(mapBranch),
            pickups: pickups.map(mapPickup),
            access: { allBranches: access.all },
          },
          200,
          { "X-Request-Id": requestId },
        );
      }

      if (request.method === "POST") {
        if (!isSameOriginRequest(request)) {
          return errorResponse("INVALID_ORIGIN", "Request origin is not allowed", 403, requestId);
        }
        const body = await request.json();
        const { data, fieldErrors } = validate(body, actor);
        if (fieldErrors.length) {
          return errorResponse("VALIDATION_ERROR", "გადაამოწმეთ შევსებული ველები", 400, requestId, fieldErrors);
        }
        if (!canUseBranch(access, data.branchId)) {
          return errorResponse("BRANCH_FORBIDDEN", "ამ ფილიალზე წვდომა არ გაქვთ", 403, requestId);
        }

        const rows = await sql`
          insert into branch_pickups (
            external_order_id, processor_external_id, processor_name, payment_method,
            customer_full_name, customer_personal_number, alternate_recipient_name,
            alternate_recipient_personal_number, branch_id, product_name, quantity,
            serial_number, issued_at, status, comment, price, source, created_by, updated_by
          ) values (
            ${data.orderNumber}, ${data.employeeExternalId}, ${data.employeeName}, ${data.paymentMethod},
            ${data.customerName}, ${data.customerPersonalNumber}, ${data.alternateName},
            ${data.alternatePersonalNumber}, ${data.branchId}, ${data.productName}, ${data.quantity},
            ${data.serialNumber}, ${data.issuedAt}, ${data.status}, ${data.comment}, ${data.price},
            ${data.source}, ${actor.id}, ${actor.id}
          )
          returning *
        `;
        const created = rows[0];
        const branch = (await sql`select name, city from retail_branches where id = ${created.branch_id}`)[0];
        await sql`
          insert into audit_logs (
            actor_user_id, actor_type, action, entity_type, entity_id,
            after_data, correlation_id
          ) values (
            ${actor.id}, 'user', 'branch_pickup.created', 'branch_pickup', ${created.id},
            ${JSON.stringify({ orderNumber: data.orderNumber, branchId: data.branchId, status: data.status })}::jsonb,
            ${requestId}
          )
        `;
        return json(
          { pickup: mapPickup({ ...created, branch_name: branch.name, branch_city: branch.city }) },
          201,
          { "X-Request-Id": requestId },
        );
      }

      if (request.method === "PATCH") {
        if (!isSameOriginRequest(request)) {
          return errorResponse("INVALID_ORIGIN", "Request origin is not allowed", 403, requestId);
        }
        const body = await request.json();
        const pickupId = clean(body.id, 40);
        const existingRows = await sql`select * from branch_pickups where id = ${pickupId} limit 1`;
        const existing = existingRows[0];
        if (!existing || !canUseBranch(access, existing.branch_id)) {
          return errorResponse("NOT_FOUND", "ჩანაწერი ვერ მოიძებნა", 404, requestId);
        }
        const { data, fieldErrors } = validate(body, actor, existing);
        if (fieldErrors.length) {
          return errorResponse("VALIDATION_ERROR", "გადაამოწმეთ შევსებული ველები", 400, requestId, fieldErrors);
        }
        if (!canUseBranch(access, data.branchId)) {
          return errorResponse("BRANCH_FORBIDDEN", "ამ ფილიალზე წვდომა არ გაქვთ", 403, requestId);
        }

        const rows = await sql`
          update branch_pickups set
            external_order_id = ${data.orderNumber},
            processor_external_id = ${data.employeeExternalId},
            processor_name = ${data.employeeName},
            payment_method = ${data.paymentMethod},
            customer_full_name = ${data.customerName},
            customer_personal_number = ${data.customerPersonalNumber},
            alternate_recipient_name = ${data.alternateName},
            alternate_recipient_personal_number = ${data.alternatePersonalNumber},
            branch_id = ${data.branchId},
            product_name = ${data.productName},
            quantity = ${data.quantity},
            serial_number = ${data.serialNumber},
            issued_at = ${data.issuedAt},
            status = ${data.status},
            comment = ${data.comment},
            price = ${data.price},
            source = ${data.source},
            updated_by = ${actor.id},
            updated_at = now()
          where id = ${pickupId}
          returning *
        `;
        const updated = rows[0];
        const branch = (await sql`select name, city from retail_branches where id = ${updated.branch_id}`)[0];
        await sql`
          insert into audit_logs (
            actor_user_id, actor_type, action, entity_type, entity_id,
            before_data, after_data, correlation_id
          ) values (
            ${actor.id}, 'user', 'branch_pickup.updated', 'branch_pickup', ${updated.id},
            ${JSON.stringify({ branchId: existing.branch_id, status: existing.status })}::jsonb,
            ${JSON.stringify({ branchId: updated.branch_id, status: updated.status })}::jsonb,
            ${requestId}
          )
        `;
        return json(
          { pickup: mapPickup({ ...updated, branch_name: branch.name, branch_city: branch.city }) },
          200,
          { "X-Request-Id": requestId },
        );
      }

      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
    } catch (error) {
      console.error("branch-pickups", requestId, error);
      return errorResponse("INTERNAL_ERROR", "ფილიალის ჩანაწერის დამუშავება ვერ შესრულდა", 500, requestId);
    }
  },
};

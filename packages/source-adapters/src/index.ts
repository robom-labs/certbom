// 공식 Q-Net 시험일정 응답을 검증하고 안정 식별자로 정규화한다.
import { z } from "zod";

const dateField = z.string().regex(/^\d{8}$/).or(z.literal(""));

export const qnetItemSchema = z.object({
  implYy: z.string().regex(/^\d{4}$/),
  implSeq: z.coerce.string().min(1),
  qualgbCd: z.enum(["T", "C", "W", "S"]),
  qualgbNm: z.string().min(1),
  description: z.string().min(1),
  docRegStartDt: dateField,
  docRegEndDt: dateField,
  docExamStartDt: dateField,
  docExamEndDt: dateField,
  docPassDt: dateField,
  pracRegStartDt: dateField,
  pracRegEndDt: dateField,
  pracExamStartDt: dateField,
  pracExamEndDt: dateField,
  pracPassDt: dateField,
});

export type QnetItem = z.infer<typeof qnetItemSchema>;

export function normalizeQnetItem(item: unknown, jmCd = "all") {
  const parsed = qnetItemSchema.parse(item);
  return {
    stableId: `qnet:${parsed.qualgbCd}:${jmCd}:${parsed.implYy}:${parsed.implSeq}`,
    year: Number(parsed.implYy),
    roundLabel: parsed.description,
    timePrecision: "conventional" as const,
    raw: parsed,
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { classifyDelivery } from "../src/receipt_sender.js";

test("classifyDelivery marks a campaign receipt as delivered when any event says delivered", () => {
  const input = [
    { type: "accepted" },
    { event: "delivered" }
  ];

  const result = classifyDelivery(input);

  assert.equal(result, "delivered");
});

test("classifyDelivery keeps status at sent when no delivered event exists", () => {
  const input = [
    { type: "queued" },
    { event: "processed" }
  ];

  const result = classifyDelivery(input);

  assert.equal(result, "sent");
});

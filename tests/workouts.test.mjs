import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { workouts, ...metadata } = JSON.parse(
  await readFile(new URL("../src/data/workouts.json", import.meta.url), "utf8"),
);

test("the split has selectable sessions, with no calendar configuration", () => {
  assert.ok(Array.isArray(workouts) && workouts.length > 0);
  assert.equal("startDate" in metadata, false);
  assert.equal("timeZone" in metadata, false);
});

test("every workout has a unique name and a focus", () => {
  assert.equal(new Set(workouts.map((workout) => workout.name)).size, workouts.length);
  for (const workout of workouts) {
    assert.ok(typeof workout.name === "string" && workout.name.trim());
    assert.ok(typeof workout.focus === "string" && workout.focus.trim());
    assert.ok(Array.isArray(workout.exercises));
  }
});

test("exercise prescriptions include a name, positive sets, and reps", () => {
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      assert.ok(typeof exercise.name === "string" && exercise.name.trim());
      assert.ok(Number.isInteger(exercise.sets) && exercise.sets > 0);
      assert.ok(typeof exercise.reps === "string" && exercise.reps.trim());
    }
  }
});

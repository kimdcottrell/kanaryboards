import { generate } from "@jsr/std__uuid/v7";

// NOTE:
// This is a simple wrapper around the UUID generation function.
// By centralizing the ID generation logic here, we can easily
// switch to a different ID generation strategy in the future if
// needed, without having to change code across the entire codebase.
//
// It is set to UUIDv7 to conform to PostgreSQL's UUIDv7 PK's
export const createId = (): string => generate();

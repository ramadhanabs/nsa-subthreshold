import { Data } from "effect"

// Auth errors
export class EmailAlreadyRegistered extends Data.TaggedError("EmailAlreadyRegistered")<{
  email: string
}> {}

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials")<{}> {}

export class InvalidToken extends Data.TaggedError("InvalidToken")<{
  reason: string
}> {}

// Generic domain errors
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  entity: string
  id: string
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string
}> {}

// Intervals.icu errors
export class IntervalsNotConnected extends Data.TaggedError("IntervalsNotConnected")<{}> {}

export class IntervalsApiError extends Data.TaggedError("IntervalsApiError")<{
  status: number
  message: string
}> {}

// Invitation errors
export class InvitationRequired extends Data.TaggedError("InvitationRequired")<{}> {}

export class InvitationExpired extends Data.TaggedError("InvitationExpired")<{}> {}

export class NotAdmin extends Data.TaggedError("NotAdmin")<{}> {}

export class PasswordMismatch extends Data.TaggedError("PasswordMismatch")<{}> {}

export class ResetTokenExpired extends Data.TaggedError("ResetTokenExpired")<{}> {}

export class RateLimitExceeded extends Data.TaggedError("RateLimitExceeded")<{}> {}

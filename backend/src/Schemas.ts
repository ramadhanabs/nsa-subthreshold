import { Schema } from "effect"

const NonEmptyString = Schema.String.pipe(Schema.minLength(1))
const Password = Schema.String.pipe(Schema.minLength(8))

export const RegisterBody = Schema.Struct({
  token: NonEmptyString,
  password: Password,
})

export const LoginBody = Schema.Struct({
  email: NonEmptyString,
  password: NonEmptyString,
})

export const ChangePasswordBody = Schema.Struct({
  currentPassword: NonEmptyString,
  newPassword: Password,
})

export const ForgotPasswordBody = Schema.Struct({
  email: NonEmptyString,
})

export const ResetPasswordBody = Schema.Struct({
  token: NonEmptyString,
  password: Password,
})

export const SaveTestBody = Schema.Struct({
  test_type: Schema.String,
  test_date: Schema.String,
  value_a: Schema.Number,
  value_b: Schema.Number,
  max_hr: Schema.optional(Schema.Number),
  notes: Schema.optional(Schema.String),
})

export const SavePlannerBody = Schema.Struct({
  week_data: Schema.Unknown,
  default_wu: Schema.Number,
  default_cd: Schema.Number,
  name: Schema.optional(Schema.String),
})

export const ConnectBody = Schema.Struct({
  athlete_id: NonEmptyString,
  api_key: NonEmptyString,
})

export const SyncBody = Schema.Struct({
  from: NonEmptyString,
  to: NonEmptyString,
})

export const ExportBody = Schema.Struct({
  week_data: Schema.Unknown,
  start_date: Schema.String,
  default_wu: Schema.optional(Schema.Number),
  default_cd: Schema.optional(Schema.Number),
})

export const CreateBlockBody = Schema.Struct({
  start_date: Schema.String,
  end_date: Schema.String,
  block_type: Schema.String,
  status: Schema.String,
  assessment: Schema.Unknown,
  weeks: Schema.Unknown,
  events: Schema.Array(
    Schema.Struct({
      date: Schema.String,
      week_number: Schema.Number,
      workout_type: Schema.String,
      name: Schema.String,
      duration_minutes: Schema.optional(Schema.Number),
      distance_meters: Schema.optional(Schema.Number),
      workout_doc: Schema.optional(Schema.Unknown),
      notes: Schema.optional(Schema.String),
    })
  ),
})

export const PushBlockBody = Schema.Struct({
  mode: Schema.Literal("override", "add_alongside"),
})

export const InviteBody = Schema.Struct({
  email: NonEmptyString,
})

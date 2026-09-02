"use client";

import type { ComponentProps, SubmitEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BatteryCharging,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  ImageIcon,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createVehicleAuction } from "@/features/auctions/admin/api";
import { adminAuctionQueryKeys } from "@/features/auctions/admin/query-keys";
import type { CreateVehicleAuctionInput } from "@/features/auctions/admin/types";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";

type FieldName =
  | "vin"
  | "make"
  | "model"
  | "year"
  | "mileageKm"
  | "batteryCapacityKwh"
  | "batteryHealthPercent"
  | "rangeKm"
  | "registrationDate"
  | "conditionNotes"
  | "photoUrls"
  | "city"
  | "country"
  | "startsAt"
  | "endsAt"
  | "startingPrice"
  | "reservePrice"
  | "minIncrement";

type FieldErrors = Partial<Record<FieldName, string>>;

const inputClassName =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/15";
const textareaClassName =
  "min-h-24 w-full resize-y rounded-lg border bg-card px-3 py-2.5 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/15";
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const DEFAULT_DURATION_MS = 24 * 60 * 60 * 1_000;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface InputFieldProps
  extends Omit<ComponentProps<"input">, "className" | "name"> {
  name: FieldName;
  label: string;
  hint?: string;
  error?: string;
  onValueChange: (name: FieldName) => void;
}

function InputField({
  name,
  label,
  hint,
  error,
  onValueChange,
  ...inputProps
}: InputFieldProps) {
  const hintId = hint ? `${name}-help` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...inputProps}
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={inputClassName}
        onChange={() => onValueChange(name)}
      />
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TextareaField({
  name,
  label,
  hint,
  error,
  placeholder,
  onValueChange,
}: {
  name: Extract<FieldName, "conditionNotes" | "photoUrls">;
  label: string;
  hint: string;
  error?: string;
  placeholder: string;
  onValueChange: (name: FieldName) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={`${name}-help${error ? ` ${name}-error` : ""}`}
        className={textareaClassName}
        onChange={() => onValueChange(name)}
      />
      <p id={`${name}-help`} className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {hint}
      </p>
      {error ? (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-1.5 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function readString(formData: FormData, name: FieldName) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function buildCreationInput(formData: FormData):
  | { input: CreateVehicleAuctionInput; errors?: never }
  | { input?: never; errors: FieldErrors } {
  const errors: FieldErrors = {};

  function requiredText(name: FieldName, label: string) {
    const value = readString(formData, name);
    if (!value) errors[name] = `${label} is required.`;
    return value;
  }

  function numberValue(
    name: FieldName,
    label: string,
    options: {
      min: number;
      max: number;
      integer?: boolean;
      maxDecimalPlaces?: number;
    },
  ) {
    const rawValue = readString(formData, name);
    const value = Number(rawValue);
    const decimalPlaces = rawValue.includes(".")
      ? (rawValue.split(".")[1]?.length ?? 0)
      : 0;
    const isValid =
      rawValue.length > 0 &&
      Number.isFinite(value) &&
      value >= options.min &&
      value <= options.max &&
      (!options.integer || Number.isSafeInteger(value)) &&
      (options.maxDecimalPlaces === undefined ||
        decimalPlaces <= options.maxDecimalPlaces);

    if (!isValid) {
      errors[name] = options.integer
        ? `${label} must be a whole number from ${options.min.toLocaleString()} to ${options.max.toLocaleString()}.`
        : `${label} must be from ${options.min.toLocaleString()} to ${options.max.toLocaleString()}.`;
    }

    return value;
  }

  const vin = requiredText("vin", "VIN").toUpperCase();
  if (vin && !VIN_PATTERN.test(vin)) {
    errors.vin = "Enter a valid 17-character VIN without I, O, or Q.";
  }

  const make = requiredText("make", "Make");
  const model = requiredText("model", "Model");
  const city = requiredText("city", "City");
  const country = requiredText("country", "Country");
  const registrationDate = requiredText(
    "registrationDate",
    "Registration date",
  );
  const maxVehicleYear = new Date().getUTCFullYear() + 1;
  const year = numberValue("year", "Year", {
    min: 1886,
    max: maxVehicleYear,
    integer: true,
  });
  const mileageKm = numberValue("mileageKm", "Mileage", {
    min: 0,
    max: POSTGRES_INTEGER_MAX,
    integer: true,
  });
  const batteryCapacityKwh = numberValue(
    "batteryCapacityKwh",
    "Battery capacity",
    { min: 0.01, max: 999.99, maxDecimalPlaces: 2 },
  );
  const batteryHealthPercent = numberValue(
    "batteryHealthPercent",
    "Battery state of health",
    { min: 0, max: 100, maxDecimalPlaces: 2 },
  );
  const rangeKm = numberValue("rangeKm", "Range", {
    min: 0,
    max: POSTGRES_INTEGER_MAX,
    integer: true,
  });
  const startingPrice = numberValue("startingPrice", "Starting price", {
    min: 1,
    max: POSTGRES_INTEGER_MAX,
    integer: true,
  });
  const reservePrice = numberValue("reservePrice", "Reserve price", {
    min: 0,
    max: POSTGRES_INTEGER_MAX,
    integer: true,
  });
  const minIncrement = numberValue("minIncrement", "Minimum increment", {
    min: 1,
    max: POSTGRES_INTEGER_MAX,
    integer: true,
  });

  const startsAtValue = requiredText("startsAt", "Start time");
  const endsAtValue = readString(formData, "endsAt");
  const startsAt = new Date(startsAtValue);
  const endsAt = endsAtValue ? new Date(endsAtValue) : null;

  if (startsAtValue && Number.isNaN(startsAt.getTime())) {
    errors.startsAt = "Enter a valid start date and time.";
  }
  if (endsAtValue && (!endsAt || Number.isNaN(endsAt.getTime()))) {
    errors.endsAt = "Enter a valid end date and time.";
  }

  if (!errors.startsAt && !errors.endsAt) {
    const resolvedEndsAt = endsAt ?? new Date(startsAt.getTime() + DEFAULT_DURATION_MS);
    if (resolvedEndsAt <= startsAt) {
      errors.endsAt = "End time must be later than the start time.";
    } else if (resolvedEndsAt <= new Date()) {
      errors[endsAt ? "endsAt" : "startsAt"] = endsAt
        ? "End time must be in the future."
        : "The default 24-hour window must end in the future.";
    }
  }

  const photoUrlLines = readString(formData, "photoUrls")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  for (const photoUrl of photoUrlLines) {
    try {
      const parsedUrl = new URL(photoUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      errors.photoUrls = "Enter one complete http:// or https:// URL per line.";
      break;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };

  const conditionNotes = readString(formData, "conditionNotes");

  return {
    input: {
      vehicle: {
        vin,
        make,
        model,
        year,
        mileageKm,
        batteryCapacityKwh,
        batteryHealthPercent,
        rangeKm,
        registrationDate,
        ...(conditionNotes ? { conditionNotes } : {}),
        ...(photoUrlLines.length > 0 ? { photoUrls: photoUrlLines } : {}),
        city,
        country,
      },
      auction: {
        startsAt: startsAt.toISOString(),
        ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
        startingPrice,
        reservePrice,
        minIncrement,
      },
    },
  };
}

function getSubmissionError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have permission to create auctions.";
  }
  if (error instanceof ApiError) return error.message;
  return "We couldn’t create the auction. Please try again.";
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CarFront;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="gap-2 border-b px-5 py-5 sm:px-6">
      <span className="mb-1 grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      <CardDescription className="leading-6">{description}</CardDescription>
    </CardHeader>
  );
}

export function CreateVehicleAuctionScreen() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({});
  const createMutation = useMutation({
    mutationFn: (input: CreateVehicleAuctionInput) => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return createVehicleAuction(accessToken, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminAuctionQueryKeys.all,
      });
    },
  });

  function clearFieldError(name: FieldName) {
    if (validationErrors[name]) {
      setValidationErrors((current) => ({ ...current, [name]: undefined }));
    }
    if (createMutation.isError) createMutation.reset();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildCreationInput(new FormData(event.currentTarget));

    if (result.errors) {
      setValidationErrors(result.errors);
      const firstInvalidField = Object.keys(result.errors)[0] as FieldName;
      const element = event.currentTarget.elements.namedItem(firstInvalidField);
      if (element instanceof HTMLElement) element.focus();
      return;
    }

    setValidationErrors({});
    createMutation.mutate(result.input);
  }

  if (createMutation.data) {
    const auction = createMutation.data;
    return (
      <div className="mx-auto max-w-2xl py-8 sm:py-14">
        <Card className="gap-0 py-0 text-center shadow-sm">
          <CardContent className="px-6 py-10 sm:px-10 sm:py-12">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
              <CheckCircle2 aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-5 text-sm font-medium text-primary">Auction created</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
              {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              The vehicle and auction were created together. The auction is {" "}
              {auction.status.toLowerCase()} and is scheduled from {" "}
              {dateTimeFormatter.format(new Date(auction.startsAt))} to {" "}
              {dateTimeFormatter.format(new Date(auction.endsAt))}.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`/admin/auctions/${auction.id}`}
                className={buttonVariants({ size: "lg" })}
              >
                View auction
              </Link>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => createMutation.reset()}
              >
                Create another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/auctions"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to auctions
      </Link>

      <div className="mt-5">
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          Create vehicle and auction
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
          Publish the vehicle and configure its sealed-bid window in one step.
        </p>
      </div>

      <form className="mt-7" onSubmit={handleSubmit} noValidate>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card className="gap-0 py-0 shadow-none">
              <SectionHeading
                icon={CarFront}
                title="Vehicle identity"
                description="Core identification and specification details shown to dealers."
              />
              <CardContent className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
                <div className="sm:col-span-2">
                  <InputField
                    name="vin"
                    label="VIN"
                    hint="17 characters; letters I, O, and Q are not used."
                    placeholder="5YJ3E7EA1KF000001"
                    minLength={17}
                    maxLength={17}
                    required
                    autoCapitalize="characters"
                    spellCheck={false}
                    error={validationErrors.vin}
                    onValueChange={clearFieldError}
                  />
                </div>
                <InputField
                  name="make"
                  label="Make"
                  placeholder="Tesla"
                  required
                  error={validationErrors.make}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="model"
                  label="Model"
                  placeholder="Model 3 Long Range"
                  required
                  error={validationErrors.model}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="year"
                  label="Model year"
                  type="number"
                  inputMode="numeric"
                  min={1886}
                  max={new Date().getUTCFullYear() + 1}
                  step={1}
                  placeholder={String(new Date().getUTCFullYear())}
                  required
                  error={validationErrors.year}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="registrationDate"
                  label="Registration date"
                  type="date"
                  required
                  error={validationErrors.registrationDate}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="mileageKm"
                  label="Mileage (km)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={POSTGRES_INTEGER_MAX}
                  step={1}
                  placeholder="48500"
                  required
                  error={validationErrors.mileageKm}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="rangeKm"
                  label="Estimated range (km)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={POSTGRES_INTEGER_MAX}
                  step={1}
                  placeholder="560"
                  required
                  error={validationErrors.rangeKm}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="batteryCapacityKwh"
                  label="Battery capacity (kWh)"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  max={999.99}
                  step={0.01}
                  placeholder="75"
                  required
                  error={validationErrors.batteryCapacityKwh}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="batteryHealthPercent"
                  label="Battery state of health (%)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="93.5"
                  required
                  error={validationErrors.batteryHealthPercent}
                  onValueChange={clearFieldError}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 py-0 shadow-none">
              <SectionHeading
                icon={MapPin}
                title="Location and condition"
                description="Add the collection location and an honest condition summary."
              />
              <CardContent className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
                <InputField
                  name="city"
                  label="City"
                  placeholder="Madrid"
                  required
                  error={validationErrors.city}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="country"
                  label="Country"
                  placeholder="Spain"
                  required
                  error={validationErrors.country}
                  onValueChange={clearFieldError}
                />
                <div className="sm:col-span-2">
                  <TextareaField
                    name="conditionNotes"
                    label="Condition notes"
                    hint="Optional. Mention material defects, service history, and included equipment."
                    placeholder="Clean interior, minor curb rash on the rear-left wheel…"
                    error={validationErrors.conditionNotes}
                    onValueChange={clearFieldError}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0 shadow-none">
              <SectionHeading
                icon={ImageIcon}
                title="Vehicle photos"
                description="The first image becomes the auction cover photo."
              />
              <CardContent className="px-5 py-6 sm:px-6">
                <TextareaField
                  name="photoUrls"
                  label="Photo URLs"
                  hint="Optional. Add one complete http:// or https:// image URL per line."
                  placeholder={"https://example.com/front.jpg\nhttps://example.com/interior.jpg"}
                  error={validationErrors.photoUrls}
                  onValueChange={clearFieldError}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="gap-0 py-0 shadow-none lg:sticky lg:top-6">
            <SectionHeading
              icon={CalendarClock}
              title="Auction settings"
              description="Set the sealed bidding window and whole-euro pricing rules."
            />
            <CardContent className="space-y-5 px-5 py-6">
              <InputField
                name="startsAt"
                label="Starts at"
                type="datetime-local"
                hint="Entered in your local time zone."
                required
                error={validationErrors.startsAt}
                onValueChange={clearFieldError}
              />
              <InputField
                name="endsAt"
                label="Ends at"
                type="datetime-local"
                hint="Optional. Leave blank for a 24-hour auction."
                error={validationErrors.endsAt}
                onValueChange={clearFieldError}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <InputField
                    name="startingPrice"
                    label="Starting price (€)"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={POSTGRES_INTEGER_MAX}
                    step={1}
                    placeholder="24000"
                    required
                    error={validationErrors.startingPrice}
                    onValueChange={clearFieldError}
                  />
                </div>
                <InputField
                  name="reservePrice"
                  label="Reserve (€)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={POSTGRES_INTEGER_MAX}
                  step={1}
                  placeholder="28000"
                  required
                  error={validationErrors.reservePrice}
                  onValueChange={clearFieldError}
                />
                <InputField
                  name="minIncrement"
                  label="Min. raise (€)"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={POSTGRES_INTEGER_MAX}
                  step={1}
                  placeholder="250"
                  required
                  error={validationErrors.minIncrement}
                  onValueChange={clearFieldError}
                />
              </div>

              <div className="flex gap-2 rounded-lg bg-muted px-3 py-3 text-xs leading-5 text-muted-foreground">
                <Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Auction timing and pricing are validated again by the server when
                you publish.
              </div>

              {createMutation.isError ? (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/8 px-3 py-2.5 text-sm leading-6 text-destructive"
                >
                  {getSubmissionError(createMutation.error)}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="h-10 w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : null}
                {createMutation.isPending
                  ? "Creating auction…"
                  : "Create vehicle and auction"}
              </Button>

              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <BatteryCharging
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0"
                />
                Reserve pricing remains visible only to administrators.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

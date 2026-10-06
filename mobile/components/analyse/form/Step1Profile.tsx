import { Text, View } from "react-native";
import { useFormContext } from "react-hook-form";
import {
  CITY_TIER_LABELS,
  CITY_TIER_VALUES,
  LIFE_STAGE_LABELS,
  LIFE_STAGE_VALUES,
  type AnalyseFormValues,
  type CityTier,
  type KidGender,
  type LifeStage,
} from "@/lib/analyse-form-schema";
import {
  AgeField,
  Card,
  ChoiceCards,
  ErrorText,
  FieldLabel,
  RadioCards,
  formStyles,
} from "./fields";

/** Web caps kid cards at 3; product decided mobile renders one per kid (schema max 6). */
const MAX_KID_CARDS = 6;

export function Step1Profile() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<AnalyseFormValues>();
  const lifeStage = watch("lifeStage");
  const numberOfKids = watch("numberOfKids") ?? 0;
  const cityTier = watch("cityTier");
  const kidCount = Math.max(
    0,
    Math.min(Number(numberOfKids) || 0, MAX_KID_CARDS),
  );

  return (
    <View style={formStyles.stepWrap}>
      <View style={{ gap: 12 }}>
        <FieldLabel required>Life stage</FieldLabel>
        <ChoiceCards
          options={LIFE_STAGE_VALUES.map((value) => ({
            value,
            label: LIFE_STAGE_LABELS[value],
          }))}
          value={lifeStage}
          onChange={(value) =>
            setValue("lifeStage", value as LifeStage, { shouldDirty: true })
          }
        />
        <ErrorText message={errors.lifeStage?.message} />
      </View>

      <View style={{ gap: 20 }}>
        <AgeField name="selfAge" label="Your age" required />
        {lifeStage && lifeStage !== "bachelor" ? (
          <AgeField
            name="spouseAge"
            label="Spouse age"
            helper="Leave 0 if not applicable"
          />
        ) : null}
      </View>

      {lifeStage === "kids" ? (
        <View style={{ gap: 20 }}>
          <AgeField name="numberOfKids" label="Number of kids" />
          {Array.from({ length: kidCount }).map((_, index) => (
            <Card key={index}>
              <AgeField
                name={`kidsAges.${index}` as const}
                label={`Kid ${index + 1} age`}
              />
              <View style={{ gap: 8 }}>
                <Text style={formStyles.rowTitle}>Kid {index + 1} gender</Text>
                <RadioCards
                  options={[
                    { label: "Boy", value: "boy" },
                    { label: "Girl", value: "girl" },
                  ]}
                  value={watch(`kidsGenders.${index}` as const)}
                  onChange={(value) =>
                    setValue(
                      `kidsGenders.${index}` as const,
                      value as KidGender,
                    )
                  }
                />
                <ErrorText message={errors.kidsGenders?.[index]?.message} />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <FieldLabel required>City tier</FieldLabel>
        <ChoiceCards
          options={CITY_TIER_VALUES.map((value) => ({
            value,
            label: CITY_TIER_LABELS[value],
          }))}
          value={cityTier}
          onChange={(value) =>
            setValue("cityTier", value as CityTier, { shouldDirty: true })
          }
        />
        <ErrorText message={errors.cityTier?.message} />
      </View>
    </View>
  );
}

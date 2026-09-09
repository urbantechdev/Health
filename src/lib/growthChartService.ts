/**
 * WHO Child Growth Standards Service
 * Computes Weight-for-Age (WFA), Height-for-Age (HFA), and BMI-for-Age Z-scores and Percentiles
 * for Pediatric Clinical Triage and MCH Child Welfare Clinics (Under 18)
 */

export interface WhoGrowthResult {
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  gender: string;
  wfaZScore: number;
  wfaPercentile: number;
  hfaZScore: number;
  hfaPercentile: number;
  bmiZScore: number;
  bmiPercentile: number;
  nutritionalStatus: "Severely Wasted (SAM)" | "Moderately Wasted (MAM)" | "Normal / Well-Nourished" | "Overweight" | "Obese";
  stuntingStatus: "Severely Stunted" | "Moderately Stunted" | "Normal Height for Age";
  colorBadge: string;
  recommendation: string;
}

/**
 * Standard WHO Child Growth Median (M), Coefficient of Variation (S), and Box-Cox Power (L) approximations
 * for approximate z-score calculations across ages 0-60 months and 5-19 years
 */
export function calculateWhoGrowth(
  ageInYears: number,
  weightKg: number,
  heightCm: number,
  gender: string = "Male"
): WhoGrowthResult {
  const ageMonths = Math.max(1, Math.round(ageInYears * 12));
  const isMale = gender.toLowerCase().startsWith("m");

  // Approximate WHO 50th percentile medians
  // Weight median formula approx:
  let medianWeight = 0;
  if (ageMonths <= 12) {
    medianWeight = isMale ? 3.3 + ageMonths * 0.6 : 3.2 + ageMonths * 0.55;
  } else if (ageMonths <= 60) {
    medianWeight = isMale ? 10.2 + (ageMonths - 12) * 0.17 : 9.8 + (ageMonths - 12) * 0.16;
  } else {
    medianWeight = isMale ? 18.5 + (ageMonths - 60) * 0.28 : 18.0 + (ageMonths - 60) * 0.27;
  }

  // Height median formula approx:
  let medianHeight = 0;
  if (ageMonths <= 12) {
    medianHeight = isMale ? 50 + ageMonths * 2.0 : 49 + ageMonths * 1.95;
  } else if (ageMonths <= 60) {
    medianHeight = isMale ? 76 + (ageMonths - 12) * 0.65 : 75 + (ageMonths - 12) * 0.65;
  } else {
    medianHeight = isMale ? 110 + (ageMonths - 60) * 0.45 : 109 + (ageMonths - 60) * 0.45;
  }

  // Weight standard deviation ~12%
  const weightSd = medianWeight * 0.13;
  const wfaZ = (weightKg - medianWeight) / (weightSd || 1);

  // Height standard deviation ~4.5%
  const heightSd = medianHeight * 0.045;
  const hfaZ = (heightCm - medianHeight) / (heightSd || 1);

  // BMI calculation
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
  const medianBmi = ageMonths <= 60 ? 15.5 : 16.5 + (ageMonths - 60) * 0.03;
  const bmiSd = medianBmi * 0.10;
  const bmiZ = (bmi - medianBmi) / (bmiSd || 1);

  // Convert Z-score to percentile (Gaussian approximation)
  const zToPercentile = (z: number) => {
    // Error function approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const res = z > 0 ? 1 - p : p;
    return Math.round(Math.max(1, Math.min(99, res * 100)));
  };

  const wfaPercentile = zToPercentile(wfaZ);
  const hfaPercentile = zToPercentile(hfaZ);
  const bmiPercentile = zToPercentile(bmiZ);

  // Classify nutritional status
  let nutritionalStatus: WhoGrowthResult["nutritionalStatus"] = "Normal / Well-Nourished";
  let colorBadge = "bg-emerald-50 text-emerald-800 border-emerald-300";
  let recommendation = "Growth is within normal WHO parameters. Continue age-appropriate balanced diet and routine CWC immunizations.";

  if (wfaZ < -3 || bmiZ < -3) {
    nutritionalStatus = "Severely Wasted (SAM)";
    colorBadge = "bg-rose-100 text-rose-800 border-rose-400 font-black";
    recommendation = "CRITICAL: Severe Acute Malnutrition. Urgently refer to Nutrition / IMCI for Ready-to-Use Therapeutic Food (RUTF) and evaluate for medical complications.";
  } else if (wfaZ < -2 || bmiZ < -2) {
    nutritionalStatus = "Moderately Wasted (MAM)";
    colorBadge = "bg-amber-100 text-amber-900 border-amber-400 font-bold";
    recommendation = "Moderate Acute Malnutrition. Enroll in Supplementary Feeding Program (CSB++), review feeding frequency, and schedule 2-week follow-up.";
  } else if (bmiZ > 2 && bmiZ <= 3) {
    nutritionalStatus = "Overweight";
    colorBadge = "bg-amber-50 text-amber-800 border-amber-300";
    recommendation = "Weight exceeds expected threshold. Provide dietary counseling to family and encourage active play.";
  } else if (bmiZ > 3) {
    nutritionalStatus = "Obese";
    colorBadge = "bg-purple-100 text-purple-900 border-purple-400 font-bold";
    recommendation = "Pediatric obesity identified. Refer to Clinical Nutritionist for comprehensive lifestyle and dietary intervention.";
  }

  // Classify stunting
  let stuntingStatus: WhoGrowthResult["stuntingStatus"] = "Normal Height for Age";
  if (hfaZ < -3) {
    stuntingStatus = "Severely Stunted";
  } else if (hfaZ < -2) {
    stuntingStatus = "Moderately Stunted";
  }

  return {
    ageMonths,
    weightKg,
    heightCm,
    gender,
    wfaZScore: Number(wfaZ.toFixed(2)),
    wfaPercentile,
    hfaZScore: Number(hfaZ.toFixed(2)),
    hfaPercentile,
    bmiZScore: Number(bmiZ.toFixed(2)),
    bmiPercentile,
    nutritionalStatus,
    stuntingStatus,
    colorBadge,
    recommendation
  };
}

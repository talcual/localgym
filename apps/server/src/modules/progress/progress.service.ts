import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@libsql/client';

import { DATABASE } from '../../database/database.tokens';
import { BmiInfo, BodyMeasurement, WeightEntry } from '../../database/types';
import { UsersService } from '../users/users.service';
import { WeightService } from '../weight/weight.service';
import { MeasurementsService } from '../measurements/measurements.service';

export interface ProgressSummary {
  bmi: BmiInfo;
  latestWeight: WeightEntry | null;
  previousWeight: WeightEntry | null;
  weightDelta: number | null;
  latestMeasurement: BodyMeasurement | null;
  previousMeasurement: BodyMeasurement | null;
}

@Injectable()
export class ProgressService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly usersService: UsersService,
    private readonly weightService: WeightService,
    private readonly measurementsService: MeasurementsService,
  ) {}

  async summary(userId: string): Promise<ProgressSummary> {
    const [user, weights, measurements] = await Promise.all([
      this.usersService.findById(userId),
      this.weightService.list(userId),
      this.measurementsService.list(userId),
    ]);

    const latestWeight = weights[0] ?? null;
    const previousWeight = weights[1] ?? null;
    const latestMeasurement = measurements[0] ?? null;
    const previousMeasurement = measurements[1] ?? null;

    const weightDelta =
      latestWeight && previousWeight
        ? Number((latestWeight.weightKg - previousWeight.weightKg).toFixed(2))
        : null;

    const bmi = computeBmi(
      user?.heightCm ?? null,
      latestWeight?.weightKg ?? null,
    );

    return {
      bmi,
      latestWeight,
      previousWeight,
      weightDelta,
      latestMeasurement,
      previousMeasurement,
    };
  }

  async bmiHistory(
    userId: string,
  ): Promise<Array<{ recordedAt: string; bmi: number; weightKg: number }>> {
    const user = await this.usersService.findById(userId);
    if (!user?.heightCm) return [];
    const heightM = user.heightCm / 100;
    const res = await this.db.execute({
      sql: 'SELECT weight_kg, recorded_at FROM weight_entries WHERE user_id = ? ORDER BY recorded_at ASC LIMIT 500',
      args: [userId],
    });
    return res.rows.map((r: any) => {
      const weight = Number(r.weight_kg);
      return {
        recordedAt: String(r.recorded_at),
        weightKg: weight,
        bmi: Number((weight / (heightM * heightM)).toFixed(2)),
      };
    });
  }
}

function computeBmi(
  heightCm: number | null,
  weightKg: number | null,
): BmiInfo {
  if (!heightCm || !weightKg) {
    return {
      bmi: null,
      category: null,
      categoryLabel: null,
      weightKg,
      heightCm,
    };
  }
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(2));
  const { category, label } = classifyBmi(bmi);
  return {
    bmi,
    category,
    categoryLabel: label,
    weightKg,
    heightCm,
  };
}

export function classifyBmi(bmi: number): {
  category: BmiInfo['category'];
  label: string;
} {
  if (bmi < 18.5) return { category: 'UNDERWEIGHT', label: 'Bajo peso' };
  if (bmi < 25) return { category: 'NORMAL', label: 'Normal' };
  if (bmi < 30) return { category: 'OVERWEIGHT', label: 'Sobrepeso' };
  if (bmi < 35) return { category: 'OBESE_I', label: 'Obesidad I' };
  if (bmi < 40) return { category: 'OBESE_II', label: 'Obesidad II' };
  return { category: 'OBESE_III', label: 'Obesidad III' };
}

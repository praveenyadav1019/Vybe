/**
 * Vibe & Crowd scoring engine for venues.
 *
 * Scores are computed from:
 *   - Recent check-ins (last 2h)   — weight 40%
 *   - Story uploads from venue      — weight 20%
 *   - Active user count             — weight 20%
 *   - Time-of-day factor            — weight 10%
 *   - Rating boost                  — weight 10%
 *
 * All output scores are 0–100.
 */

interface VibeInput {
  checkinsLast2h: number;
  storiesLast2h: number;
  activeUsers: number;
  googleRating?: number;
  category: string;
}

interface VibeOutput {
  vibeScore: number;  // 0–100 overall vibe
  crowdScore: number; // 0–100 crowd density
  peakTime: string;   // "11 PM" style string
  trending: boolean;
  label: string;      // "🔥 Fire", "😎 Vibe", "🎉 Hype", etc.
}

function timeOfDayFactor(): number {
  const h = new Date().getHours();
  // Peak: 10 PM – 2 AM = 1.0, shoulder: 7 PM – 10 PM = 0.75, day = 0.4
  if (h >= 22 || h < 2) return 1.0;
  if (h >= 19) return 0.75;
  if (h >= 17) return 0.55;
  return 0.4;
}

function dayOfWeekFactor(): number {
  const d = new Date().getDay(); // 0=Sun, 6=Sat
  if (d === 5 || d === 6) return 1.0; // Fri/Sat
  if (d === 0 || d === 4) return 0.8; // Sun/Thu
  return 0.65;
}

function categoryBaseline(category: string): number {
  const baselines: Record<string, number> = {
    Club: 60,
    Bar: 50,
    Restaurant: 45,
    Cafe: 35,
    Casino: 55,
    Venue: 40,
  };
  return baselines[category] ?? 40;
}

export function computeVibeScore(input: VibeInput): VibeOutput {
  const tod = timeOfDayFactor();
  const dow = dayOfWeekFactor();

  // Normalize inputs to 0–100 scale
  const checkinScore = Math.min(100, input.checkinsLast2h * 4);
  const storyScore = Math.min(100, input.storiesLast2h * 8);
  const activeScore = Math.min(100, input.activeUsers * 3);
  const ratingScore = input.googleRating ? (input.googleRating / 5) * 100 : 50;
  const baseline = categoryBaseline(input.category);

  // Weighted composite
  const raw =
    checkinScore * 0.4 +
    storyScore * 0.2 +
    activeScore * 0.2 +
    ratingScore * 0.1 +
    baseline * 0.1;

  // Apply time factors
  const vibeScore = Math.min(100, Math.round(raw * tod * dow));
  const crowdScore = Math.min(
    100,
    Math.round((checkinScore * 0.5 + activeScore * 0.5) * tod)
  );

  // Trending: vibe jumped > 20 points since last hour (placeholder: use vibeScore)
  const trending = vibeScore > 70;

  // Label
  let label = "😐 Quiet";
  if (vibeScore >= 90) label = "🔥 Fire";
  else if (vibeScore >= 75) label = "🎉 Hype";
  else if (vibeScore >= 60) label = "😎 Vibe";
  else if (vibeScore >= 45) label = "✨ Active";
  else if (vibeScore >= 30) label = "👌 Chill";

  // Peak time heuristic
  const peakHour =
    input.category === "Club" ? 23 : input.category === "Bar" ? 21 : 20;
  const peak12 = peakHour > 12 ? `${peakHour - 12} PM` : `${peakHour} AM`;

  return { vibeScore, crowdScore, peakTime: peak12, trending, label };
}

/**
 * Update place activity in Prisma based on real-time data.
 */
export async function refreshVibeScore(
  prisma: import("@prisma/client").PrismaClient,
  placeId: string
): Promise<VibeOutput | null> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [place, checkinsCount] = await Promise.all([
    prisma.place.findUnique({
      where: { id: placeId },
      include: { activity: true },
    }),
    prisma.placeCheckin.count({
      where: { placeId, createdAt: { gte: twoHoursAgo } },
    }),
  ]);

  if (!place) return null;

  const activeUsers = place.activity?.activeUsers ?? 0;

  const output = computeVibeScore({
    checkinsLast2h: checkinsCount,
    storiesLast2h: 0, // Will be wired in when stories are uploaded
    activeUsers,
    category: place.category,
  });

  await prisma.placeActivity.upsert({
    where: { placeId },
    create: {
      placeId,
      vibeScore: output.vibeScore,
      crowdScore: output.crowdScore,
      activeUsers,
    },
    update: {
      vibeScore: output.vibeScore,
      crowdScore: output.crowdScore,
    },
  });

  return output;
}

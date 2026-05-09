import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Seed data ────────────────────────────────────────────────────────────────

const PLACES = [
  {
    id: "place_trilogy_bandra",
    name: "Trilogy – The Club",
    category: "club",
    address: "17B, Waterfield Rd, Bandra West, Mumbai 400050",
    lat: 19.0596,
    lng: 72.8295,
    description: "Mumbai's premier underground electronic venue with world-class DJs.",
    tags: ["electronic", "house", "techno", "18+"],
    photos: [
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
      "https://images.unsplash.com/photo-1571266028243-7c815b05f471?w=800",
    ],
    isHappening: true,
    vibeScore: 9.2,
    crowdScore: 8.7,
    activeUsers: 214,
  },
  {
    id: "place_social_hauz_khas",
    name: "Hauz Khas Social",
    category: "bar",
    address: "9A & 12, Hauz Khas Village, New Delhi 110016",
    lat: 28.5494,
    lng: 77.197,
    description: "Iconic Delhi hangout blending work, play and nightlife.",
    tags: ["indie", "craft-beer", "rooftop", "live-music"],
    photos: [
      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800",
    ],
    isHappening: true,
    vibeScore: 8.4,
    crowdScore: 7.9,
    activeUsers: 143,
  },
  {
    id: "place_vapour_bangalore",
    name: "Vapour Bar Exchange",
    category: "bar",
    address: "1st Floor, Empire Hotel, Church Street, Bangalore 560001",
    lat: 12.9757,
    lng: 77.6065,
    description: "Craft cocktails, live sports, and the best after-party in Bangalore.",
    tags: ["cocktails", "sports-bar", "dj"],
    photos: [
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800",
    ],
    isHappening: true,
    vibeScore: 7.8,
    crowdScore: 8.1,
    activeUsers: 89,
  },
  {
    id: "place_skybar_mumbai",
    name: "AER – Four Seasons Rooftop",
    category: "rooftop",
    address: "Four Seasons Hotel, 114 Dr E Moses Rd, Worli, Mumbai 400018",
    lat: 19.0096,
    lng: 72.8193,
    description: "Mumbai's most stunning rooftop bar with panoramic city views.",
    tags: ["rooftop", "premium", "cocktails", "views"],
    photos: [
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
    ],
    isHappening: false,
    vibeScore: 9.0,
    crowdScore: 6.5,
    activeUsers: 34,
  },
  {
    id: "place_kitty_ko_delhi",
    name: "Kitty Ko",
    category: "lounge",
    address: "Plot 9, Sundar Nagar, New Delhi 110003",
    lat: 28.5933,
    lng: 77.2332,
    description: "Intimate cocktail lounge with curated music and chic vibes.",
    tags: ["lounge", "cocktails", "intimate"],
    photos: [
      "https://images.unsplash.com/photo-1567696153798-9111f9cd3d0d?w=800",
    ],
    isHappening: true,
    vibeScore: 8.0,
    crowdScore: 7.2,
    activeUsers: 58,
  },
];

const USERS = [
  {
    phone: "+919876543201",
    profile: {
      name: "Aanya Sharma",
      age: 24,
      gender: "female",
      bio: "House music, bad puns and good sunsets 🌅. Looking for co-travel & club mates.",
      interests: ["techno", "sunrise-sets", "bouldering", "chai"],
      photos: [
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400",
      ],
      verified: true,
      mode: "co_travel" as const,
    },
    lat: 19.0596,
    lng: 72.8295,
  },
  {
    phone: "+919876543202",
    profile: {
      name: "Rahul Mehta",
      age: 27,
      gender: "male",
      bio: "Mixologist by day, raver by night. Catch me at the decks or on a trail.",
      interests: ["deep-house", "mixology", "hiking", "photography"],
      photos: [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      ],
      verified: true,
      mode: "club_mates" as const,
    },
    lat: 19.0604,
    lng: 72.8299,
  },
  {
    phone: "+919876543203",
    profile: {
      name: "Priya Nair",
      age: 26,
      gender: "female",
      bio: "Bangalore girl exploring the world. UX designer and weekend DJ.",
      interests: ["design", "djing", "travel", "indie-music"],
      photos: [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
      ],
      verified: true,
      mode: "night_out" as const,
    },
    lat: 12.9757,
    lng: 77.6065,
  },
  {
    phone: "+919876543204",
    profile: {
      name: "Arjun Kapoor",
      age: 29,
      gender: "male",
      bio: "Delhi nights, Mumbai vibes. Entrepreneur and part-time poet.",
      interests: ["poetry", "startup", "afters", "jazz"],
      photos: [
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
      ],
      verified: false,
      mode: "dating" as const,
    },
    lat: 28.5494,
    lng: 77.197,
  },
  {
    phone: "+919876543205",
    profile: {
      name: "Zara Khan",
      age: 23,
      gender: "female",
      bio: "Content creator x fashion enthusiast. Here for the night-outs and good vibes.",
      interests: ["fashion", "content", "rave", "sushi"],
      photos: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      ],
      verified: true,
      mode: "night_out" as const,
    },
    lat: 19.062,
    lng: 72.831,
  },
  {
    phone: "+919876543206",
    profile: {
      name: "Karthik Reddy",
      age: 28,
      gender: "male",
      bio: "Tech bro who escapes to dark rooms on weekends. Techno is life.",
      interests: ["techno", "coding", "travel", "coffee"],
      photos: [
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
      ],
      verified: false,
      mode: "club_mates" as const,
    },
    lat: 12.9762,
    lng: 77.6071,
  },
  {
    phone: "+919876543207",
    profile: {
      name: "Nisha Patel",
      age: 25,
      gender: "female",
      bio: "Dreaming of Goa, currently in Bombay. Let's co-travel!",
      interests: ["travel", "yoga", "psytrance", "beach"],
      photos: [
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400",
      ],
      verified: true,
      mode: "co_travel" as const,
    },
    lat: 19.058,
    lng: 72.828,
  },
  {
    phone: "+919876543208",
    profile: {
      name: "Dev Singhania",
      age: 31,
      gender: "male",
      bio: "Finance x Music. Building stuff by day, losing myself on the dance floor by night.",
      interests: ["house", "finance", "wine", "art"],
      photos: [
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
      ],
      verified: true,
      mode: "hook" as const,
    },
    lat: 28.596,
    lng: 77.235,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding VYBEON database…");

  // Clean slate
  await prisma.notification.deleteMany();
  await prisma.placeCheckin.deleteMany();
  await prisma.placeActivity.deleteMany();
  await prisma.place.deleteMany();
  await prisma.block.deleteMany();
  await prisma.report.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.matchRequest.deleteMany();
  await prisma.deviceSession.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.user.deleteMany();

  console.log("  ✓ Cleaned existing data");

  // ─── Places ────────────────────────────────────────────────────────────────
  for (const p of PLACES) {
    await prisma.place.create({
      data: {
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        description: p.description,
        tags: p.tags,
        photos: p.photos,
        isHappening: p.isHappening,
        activity: {
          create: {
            activeUsers: p.activeUsers,
            vibeScore: p.vibeScore,
            crowdScore: p.crowdScore,
          },
        },
      },
    });
  }
  console.log(`  ✓ Seeded ${PLACES.length} places`);

  // ─── Users ─────────────────────────────────────────────────────────────────
  const createdUsers: { id: string; phone: string }[] = [];

  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        phone: u.phone,
        isOnline: Math.random() > 0.4,
        profile: {
          create: {
            name: u.profile.name,
            age: u.profile.age,
            gender: u.profile.gender,
            bio: u.profile.bio,
            interests: u.profile.interests,
            photos: u.profile.photos,
            verified: u.profile.verified,
            mode: u.profile.mode,
          },
        },
        verification: {
          create: {
            status: u.profile.verified ? "verified" : "none",
            livenessScore: u.profile.verified ? 0.88 + Math.random() * 0.1 : 0,
          },
        },
        location: {
          create: {
            lat: u.lat,
            lng: u.lng,
          },
        },
        subscription: {
          create: {
            plan: u.profile.verified && Math.random() > 0.5 ? "vybeon_plus" : "free",
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    createdUsers.push({ id: user.id, phone: u.phone });
  }
  console.log(`  ✓ Seeded ${USERS.length} users`);

  // ─── Match Requests ────────────────────────────────────────────────────────
  // User 0 pings User 1 and User 4
  await prisma.matchRequest.createMany({
    data: [
      {
        fromUserId: createdUsers[0].id,
        toUserId: createdUsers[1].id,
        status: "accepted",
        message: "Saw you at Trilogy last night? 👀",
      },
      {
        fromUserId: createdUsers[0].id,
        toUserId: createdUsers[4].id,
        status: "pending",
        message: "Co-travel to Goa next month?",
      },
      {
        fromUserId: createdUsers[2].id,
        toUserId: createdUsers[0].id,
        status: "pending",
      },
      {
        fromUserId: createdUsers[5].id,
        toUserId: createdUsers[6].id,
        status: "accepted",
      },
    ],
    skipDuplicates: true,
  });

  // ─── Chats (for accepted matches) ─────────────────────────────────────────
  const chat1 = await prisma.chat.create({
    data: {
      users: {
        connect: [{ id: createdUsers[0].id }, { id: createdUsers[1].id }],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        chatId: chat1.id,
        senderId: createdUsers[1].id,
        content: "Heyy! Yes that was me at Trilogy 😄",
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        chatId: chat1.id,
        senderId: createdUsers[0].id,
        content: "I knew it! Your moves were insane. Back next Friday? 🔥",
        createdAt: new Date(Date.now() - 58 * 60 * 1000),
      },
      {
        chatId: chat1.id,
        senderId: createdUsers[1].id,
        content: "Absolutely! They have Anyma playing. Should be legendary.",
        createdAt: new Date(Date.now() - 55 * 60 * 1000),
      },
    ],
  });

  const chat2 = await prisma.chat.create({
    data: {
      users: {
        connect: [{ id: createdUsers[5].id }, { id: createdUsers[6].id }],
      },
    },
  });

  await prisma.message.create({
    data: {
      chatId: chat2.id,
      senderId: createdUsers[5].id,
      content: "Namaste! Up for club mates at Vapour this weekend?",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  console.log("  ✓ Seeded match requests, chats and messages");

  // ─── Place checkins ───────────────────────────────────────────────────────
  await prisma.placeCheckin.createMany({
    data: [
      { placeId: PLACES[0].id, userId: createdUsers[0].id },
      { placeId: PLACES[0].id, userId: createdUsers[1].id },
      { placeId: PLACES[1].id, userId: createdUsers[3].id },
    ],
  });

  // ─── Sample notification ───────────────────────────────────────────────────
  await prisma.notification.create({
    data: {
      userId: createdUsers[0].id,
      type: "match_request",
      title: "New ping!",
      body: `${USERS[2].profile.name} sent you a ping`,
      data: { fromUserId: createdUsers[2].id },
    },
  });

  console.log("  ✓ Seeded checkins and notifications");
  console.log("✅ Seed complete!");
  console.log("\nDemo credentials:");
  for (const u of USERS.slice(0, 3)) {
    console.log(`  Phone: ${u.phone}  OTP: 123456  Name: ${u.profile.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

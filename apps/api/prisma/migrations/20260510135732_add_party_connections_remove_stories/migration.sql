/*
  Warnings:

  - A unique constraint covering the columns `[googlePlaceId]` on the table `Place` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('active', 'cancelled', 'ended', 'full');

-- CreateEnum
CREATE TYPE "PartyVisibility" AS ENUM ('public', 'invite_only', 'verified_only');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'waitlisted');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('matched', 'met_at_venue', 'met_at_party', 'stranger_chat');

-- CreateEnum
CREATE TYPE "ClubMateStatus" AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "ClubMateType" AS ENUM ('female', 'male', 'couple', 'group', 'any');

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "openNow" BOOLEAN,
ADD COLUMN     "priceLevel" INTEGER,
ADD COLUMN     "rating" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PlaceActivity" ADD COLUMN     "genderRatio" DOUBLE PRECISION,
ADD COLUMN     "musicType" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "nightlifePrefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vibeTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "HouseParty" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "vibeType" TEXT NOT NULL,
    "musicType" TEXT,
    "ageMin" INTEGER NOT NULL DEFAULT 18,
    "ageMax" INTEGER,
    "allowMale" BOOLEAN NOT NULL DEFAULT true,
    "allowFemale" BOOLEAN NOT NULL DEFAULT true,
    "allowCouple" BOOLEAN NOT NULL DEFAULT true,
    "maxAttendees" INTEGER NOT NULL DEFAULT 30,
    "isByob" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "entryFee" DOUBLE PRECISION,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "PartyStatus" NOT NULL DEFAULT 'active',
    "visibility" "PartyVisibility" NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyJoinRequest" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyAttendee" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL DEFAULT 'matched',
    "metAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMateRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "placeId" TEXT,
    "status" "ClubMateStatus" NOT NULL DEFAULT 'pending',
    "type" "ClubMateType" NOT NULL DEFAULT 'any',
    "goingAt" TIMESTAMP(3),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "userId" TEXT NOT NULL,
    "venueId" TEXT,
    "venueName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "currentActivity" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StrangerQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'text',
    "genderPref" TEXT NOT NULL DEFAULT 'everyone',
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nearbyOnly" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrangerQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrangerSession" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'text',
    "status" TEXT NOT NULL DEFAULT 'active',
    "roomId" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrangerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrangerMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrangerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "strangerMode" TEXT NOT NULL DEFAULT 'text',
    "genderPref" TEXT NOT NULL DEFAULT 'everyone',
    "nearbyOnly" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "allowStrangers" BOOLEAN NOT NULL DEFAULT true,
    "showDistance" BOOLEAN NOT NULL DEFAULT true,
    "maxRadiusM" INTEGER NOT NULL DEFAULT 5000,
    "privacyLevel" TEXT NOT NULL DEFAULT 'public',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "VideoModerationFlag" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoModerationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseParty_hostId_idx" ON "HouseParty"("hostId");

-- CreateIndex
CREATE INDEX "HouseParty_city_status_idx" ON "HouseParty"("city", "status");

-- CreateIndex
CREATE INDEX "HouseParty_startsAt_status_idx" ON "HouseParty"("startsAt", "status");

-- CreateIndex
CREATE INDEX "HouseParty_lat_lng_idx" ON "HouseParty"("lat", "lng");

-- CreateIndex
CREATE INDEX "PartyJoinRequest_partyId_status_idx" ON "PartyJoinRequest"("partyId", "status");

-- CreateIndex
CREATE INDEX "PartyJoinRequest_userId_idx" ON "PartyJoinRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyJoinRequest_partyId_userId_key" ON "PartyJoinRequest"("partyId", "userId");

-- CreateIndex
CREATE INDEX "PartyAttendee_partyId_idx" ON "PartyAttendee"("partyId");

-- CreateIndex
CREATE INDEX "PartyAttendee_userId_idx" ON "PartyAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyAttendee_partyId_userId_key" ON "PartyAttendee"("partyId", "userId");

-- CreateIndex
CREATE INDEX "Connection_userAId_idx" ON "Connection"("userAId");

-- CreateIndex
CREATE INDEX "Connection_userBId_idx" ON "Connection"("userBId");

-- CreateIndex
CREATE INDEX "Connection_type_idx" ON "Connection"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_userAId_userBId_key" ON "Connection"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "ClubMateRequest_fromUserId_idx" ON "ClubMateRequest"("fromUserId");

-- CreateIndex
CREATE INDEX "ClubMateRequest_toUserId_idx" ON "ClubMateRequest"("toUserId");

-- CreateIndex
CREATE INDEX "ClubMateRequest_placeId_status_idx" ON "ClubMateRequest"("placeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StrangerQueue_userId_key" ON "StrangerQueue"("userId");

-- CreateIndex
CREATE INDEX "StrangerQueue_mode_genderPref_country_idx" ON "StrangerQueue"("mode", "genderPref", "country");

-- CreateIndex
CREATE INDEX "StrangerQueue_expiresAt_idx" ON "StrangerQueue"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrangerSession_roomId_key" ON "StrangerSession"("roomId");

-- CreateIndex
CREATE INDEX "StrangerSession_userAId_status_idx" ON "StrangerSession"("userAId", "status");

-- CreateIndex
CREATE INDEX "StrangerSession_userBId_status_idx" ON "StrangerSession"("userBId", "status");

-- CreateIndex
CREATE INDEX "StrangerSession_status_createdAt_idx" ON "StrangerSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StrangerMessage_sessionId_createdAt_idx" ON "StrangerMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoModerationFlag_sessionId_idx" ON "VideoModerationFlag"("sessionId");

-- CreateIndex
CREATE INDEX "VideoModerationFlag_reporterId_idx" ON "VideoModerationFlag"("reporterId");

-- CreateIndex
CREATE INDEX "VideoModerationFlag_resolved_severity_idx" ON "VideoModerationFlag"("resolved", "severity");

-- CreateIndex
CREATE INDEX "LocationHistory_userId_createdAt_idx" ON "LocationHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Place_googlePlaceId_key" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Place_googlePlaceId_idx" ON "Place"("googlePlaceId");

-- AddForeignKey
ALTER TABLE "HouseParty" ADD CONSTRAINT "HouseParty_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyJoinRequest" ADD CONSTRAINT "PartyJoinRequest_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HouseParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyJoinRequest" ADD CONSTRAINT "PartyJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyAttendee" ADD CONSTRAINT "PartyAttendee_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "HouseParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyAttendee" ADD CONSTRAINT "PartyAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMateRequest" ADD CONSTRAINT "ClubMateRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMateRequest" ADD CONSTRAINT "ClubMateRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrangerQueue" ADD CONSTRAINT "StrangerQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrangerSession" ADD CONSTRAINT "StrangerSession_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrangerSession" ADD CONSTRAINT "StrangerSession_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrangerMessage" ADD CONSTRAINT "StrangerMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrangerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoModerationFlag" ADD CONSTRAINT "VideoModerationFlag_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrangerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

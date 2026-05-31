-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "people" INTEGER NOT NULL,
    "budget" TEXT NOT NULL,
    "allYouCanDrink" BOOLEAN NOT NULL,
    "beerRequired" BOOLEAN NOT NULL,
    "moodTags" JSONB NOT NULL,
    "preferences" TEXT,
    "request" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

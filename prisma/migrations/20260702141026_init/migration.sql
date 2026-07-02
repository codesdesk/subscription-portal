-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'paused', 'cancelled');

-- CreateEnum
CREATE TYPE "SubscriptionStartType" AS ENUM ('immediately', 'next_month');

-- CreateEnum
CREATE TYPE "LineItemStatus" AS ENUM ('active', 'removed');

-- CreateEnum
CREATE TYPE "SubscriptionOrderStatus" AS ENUM ('created', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "startType" "SubscriptionStartType" NOT NULL,
    "nextOrderDate" TIMESTAMP(3) NOT NULL,
    "skipNextOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionLineItem" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "tags" TEXT[],
    "status" "LineItemStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionOrder" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "shopifyOrderId" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionOrderStatus" NOT NULL,
    "invoiceStatus" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerGroup" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "groupTag" TEXT NOT NULL,
    "managerCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "customerId" TEXT,
    "adminUserId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_shop_shopifyCustomerId_idx" ON "Subscription"("shop", "shopifyCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_shop_status_nextOrderDate_idx" ON "Subscription"("shop", "status", "nextOrderDate");

-- CreateIndex
CREATE INDEX "SubscriptionLineItem_subscriptionId_status_idx" ON "SubscriptionLineItem"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionLineItem_shopifyVariantId_idx" ON "SubscriptionLineItem"("shopifyVariantId");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_subscriptionId_orderDate_idx" ON "SubscriptionOrder"("subscriptionId", "orderDate");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_shopifyOrderId_idx" ON "SubscriptionOrder"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "CustomerGroup_shop_managerCustomerId_idx" ON "CustomerGroup"("shop", "managerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerGroup_shop_groupTag_managerCustomerId_key" ON "CustomerGroup"("shop", "groupTag", "managerCustomerId");

-- CreateIndex
CREATE INDEX "AuditLog_shop_createdAt_idx" ON "AuditLog"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_shop_action_idx" ON "AuditLog"("shop", "action");

-- AddForeignKey
ALTER TABLE "SubscriptionLineItem" ADD CONSTRAINT "SubscriptionLineItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

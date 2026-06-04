// Типи бази даних для типобезпечного Supabase-клієнта.
// Відповідають supabase/schema.sql.

export type AssetType = "investment" | "safety" | "cash" | "custom";

export interface Profile {
  id: string;
  display_name: string | null;
  base_currency: string;
  dashboard_prefs: Record<string, boolean> | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  asset_id: string | null;
  amount: number;
  currency: string;
  spent_at: string; // YYYY-MM-DD
  comment: string | null;
  tags: string[];
  created_at: string;
}

export interface AssetCategory {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  icon: string;
  color: string;
  created_at: string;
}

export interface Asset {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  value: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  current_amount: number;
  asset_id: string | null;
  currency: string;
  target_date: string | null;
  created_at: string;
}

// Ціль із підтягнутим активом (для авто-прогресу).
export type GoalWithAsset = Goal & {
  asset?: { value: number; currency: string } | null;
};

export interface RecurringExpense {
  id: string;
  user_id: string;
  category_id: string | null;
  asset_id: string | null;
  name: string;
  amount: number;
  currency: string;
  day_of_month: number;
  comment: string | null;
  active: boolean;
  next_run: string;
  last_run: string | null;
  created_at: string;
}

export type RecurringWithCategory = RecurringExpense & {
  category?: { name: string; color: string; icon: string } | null;
};

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  currency: string;
  received_at: string;
  comment: string | null;
  asset_id: string | null;
  created_at: string;
}

export type IncomeWithAsset = Income & {
  asset?: { name: string; currency: string } | null;
};

export interface Credit {
  id: string;
  user_id: string;
  lender: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  payment_day: number | null;
  currency: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  period: string; // YYYY-MM-01
  amount: number;
  currency: string;
  created_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  currency: string;
  created_at: string;
}

// Витрата з підтягнутою категорією та джерелом-активом (join).
export type ExpenseWithCategory = Expense & {
  category: ExpenseCategory | null;
  asset?: { name: string; currency: string } | null;
};

export type AssetWithCategory = Asset & {
  category: AssetCategory | null;
};

// ---- Generic Database type для @supabase/ssr ----
type Row<T> = T;
type Insert<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insert<Profile, "created_at" | "base_currency" | "display_name">;
        Update: Partial<Profile>;
      };
      expense_categories: {
        Row: ExpenseCategory;
        Insert: Insert<ExpenseCategory, "id" | "created_at" | "icon" | "color">;
        Update: Partial<ExpenseCategory>;
      };
      expenses: {
        Row: Expense;
        Insert: Insert<
          Expense,
          "id" | "created_at" | "currency" | "spent_at" | "comment" | "category_id"
        >;
        Update: Partial<Expense>;
      };
      asset_categories: {
        Row: AssetCategory;
        Insert: Insert<
          AssetCategory,
          "id" | "created_at" | "icon" | "color" | "type"
        >;
        Update: Partial<AssetCategory>;
      };
      assets: {
        Row: Asset;
        Insert: Insert<
          Asset,
          "id" | "created_at" | "updated_at" | "currency" | "value" | "category_id"
        >;
        Update: Partial<Asset>;
      };
      net_worth_snapshots: {
        Row: NetWorthSnapshot;
        Insert: Insert<
          NetWorthSnapshot,
          "id" | "created_at" | "currency" | "snapshot_date" | "total_value"
        >;
        Update: Partial<NetWorthSnapshot>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

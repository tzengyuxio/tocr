"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionLabel, entityLabel } from "@/lib/edit-log-labels";

const ACTIONS = ["CREATE", "UPDATE", "DELETE"];
const ENTITY_TYPES = ["Magazine", "Issue", "Article", "Tag", "Game", "User"];

const ALL = "__all__";

export interface EditLogUserOption {
  id: string;
  label: string;
}

export function EditLogFilters({ users }: { users: EditLogUserOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Changing a filter always returns to the first page.
  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/admin/edit-logs?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get("user") || ALL}
        onValueChange={(value) => setParam("user", value)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="所有使用者" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>所有使用者</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("entity") || ALL}
        onValueChange={(value) => setParam("entity", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="所有類型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>所有類型</SelectItem>
          {ENTITY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {entityLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("action") || ALL}
        onValueChange={(value) => setParam("action", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="所有動作" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>所有動作</SelectItem>
          {ACTIONS.map((action) => (
            <SelectItem key={action} value={action}>
              {actionLabel(action)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

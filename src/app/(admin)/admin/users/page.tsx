"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, Shield, UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "VIEWER" | "EDITOR" | "ADMIN";
  createdAt: string;
  _count: {
    editLogs: number;
  };
}

const ROLE_LABELS: Record<string, string> = {
  VIEWER: "檢視者",
  EDITOR: "編輯者",
  ADMIN: "管理員",
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  VIEWER: "secondary",
  EDITOR: "default",
  ADMIN: "destructive",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("權限不足，僅管理員可存取此頁面");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("載入使用者列表失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!editingUser || !newRole) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user role");
      }

      toast.success("使用者角色已更新");
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error(error instanceof Error ? error.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">使用者管理</h1>
        <p className="text-muted-foreground">管理系統使用者與權限設定</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總使用者數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">編輯者</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "EDITOR").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理員</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "ADMIN").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>使用者列表</CardTitle>
          <CardDescription>所有已註冊的系統使用者</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋使用者..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-16 w-16 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">
                {search ? "找不到符合的使用者" : "尚無使用者"}
              </h2>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>使用者</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>編輯次數</TableHead>
                  <TableHead>註冊時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">
                          {user.name || "未設定"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>{user._count.editLogs}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.createdAt), "yyyy/MM/dd", {
                        locale: zhTW,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setNewRole(user.role);
                        }}
                      >
                        編輯權限
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯使用者權限</DialogTitle>
            <DialogDescription>
              變更 {editingUser?.name || editingUser?.email} 的系統角色
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              {editingUser?.image ? (
                <img
                  src={editingUser.image}
                  alt={editingUser.name || "User"}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="font-medium">
                  {editingUser?.name || "未設定"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {editingUser?.email}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">選擇角色</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">檢視者</Badge>
                      <span className="text-muted-foreground">
                        - 僅能瀏覽內容
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="EDITOR">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">編輯者</Badge>
                      <span className="text-muted-foreground">
                        - 可編輯內容
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">管理員</Badge>
                      <span className="text-muted-foreground">
                        - 完整系統權限
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              取消
            </Button>
            <Button onClick={handleRoleChange} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存變更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

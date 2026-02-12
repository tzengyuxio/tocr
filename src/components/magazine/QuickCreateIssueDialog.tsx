"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const quickCreateSchema = z.object({
  issueNumber: z.string().min(1, "期號為必填"),
  publishDate: z.string().min(1, "出版日期為必填"),
  title: z.string().optional(),
});

type QuickCreateFormData = z.infer<typeof quickCreateSchema>;

interface QuickCreateIssueDialogProps {
  magazineId: string;
  magazineName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCreateIssueDialog({
  magazineId,
  magazineName,
  open,
  onOpenChange,
}: QuickCreateIssueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
  });

  async function onSubmit(data: QuickCreateFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magazineId,
          issueNumber: data.issueNumber,
          publishDate: data.publishDate,
          title: data.title || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create issue");
      }

      toast.success(`已新增期數：${data.issueNumber}`);
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "新增期數失敗"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增期數 — {magazineName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issueNumber">期號 *</Label>
            <Input
              id="issueNumber"
              placeholder="例如：42"
              {...register("issueNumber")}
            />
            {errors.issueNumber && (
              <p className="text-sm text-destructive">
                {errors.issueNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishDate">出版日期 *</Label>
            <Input
              id="publishDate"
              type="date"
              {...register("publishDate")}
            />
            {errors.publishDate && (
              <p className="text-sm text-destructive">
                {errors.publishDate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">特輯標題</Label>
            <Input
              id="title"
              placeholder="選填"
              {...register("title")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "新增中..." : "新增"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

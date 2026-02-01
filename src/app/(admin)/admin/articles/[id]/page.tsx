import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "@/components/article/ArticleForm";

interface ArticleEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticleEditPage({ params }: ArticleEditPageProps) {
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      issue: {
        select: {
          id: true,
          issueNumber: true,
          magazine: {
            select: { id: true, name: true },
          },
        },
      },
      articleGames: {
        include: {
          game: {
            select: { id: true, name: true },
          },
        },
      },
      articleTags: {
        include: {
          tag: {
            select: { id: true, name: true, type: true },
          },
        },
      },
    },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <ArticleForm
        articleId={article.id}
        issueId={article.issue.id}
        magazineId={article.issue.magazine.id}
        issueName={article.issue.issueNumber}
        magazineName={article.issue.magazine.name}
        initialData={{
          title: article.title,
          subtitle: article.subtitle,
          authors: article.authors,
          category: article.category,
          pageStart: article.pageStart,
          pageEnd: article.pageEnd,
          summary: article.summary,
          content: article.content,
          sortOrder: article.sortOrder,
          articleGames: article.articleGames,
          articleTags: article.articleTags,
        }}
      />
    </div>
  );
}

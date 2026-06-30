import { redirect } from "next/navigation";

type FullCheckResultAliasPageProps = {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ reportId?: string }>;
};

export default async function FullCheckResultAliasPage({
	params,
	searchParams,
}: FullCheckResultAliasPageProps) {
	const { locale } = await params;
	const query = await searchParams;
	const reportId = query.reportId?.trim();

	if (reportId) {
		redirect(`/${locale}/full-check?source=results&reportId=${encodeURIComponent(reportId)}`);
	}

	redirect(`/${locale}/full-check`);
}

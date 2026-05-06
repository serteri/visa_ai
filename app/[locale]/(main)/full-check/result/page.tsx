import { redirect } from "next/navigation";

type FullCheckResultAliasPageProps = {
	params: Promise<{ locale: string }>;
};

export default async function FullCheckResultAliasPage({
	params,
}: FullCheckResultAliasPageProps) {
	const { locale } = await params;
	redirect(`/${locale}/full-check`);
}

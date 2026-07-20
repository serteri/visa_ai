import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown instead of real content (metrics, referral link, lead pool/queue)
 *  on every agent page until an admin approves the account. */
export function PendingApprovalNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-base text-amber-900">⏳ Hesabınız onay bekliyor</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-amber-800">
          Başvurunuz alındı. Bir admin hesabınızı onayladığında referans linkiniz ve lead havuzunuz
          burada görünür olacak.
        </p>
        <p className="mt-2 text-sm text-amber-700">
          Your application has been received. Your referral link and lead pool will appear here once
          an admin approves your account.
        </p>
      </CardContent>
    </Card>
  );
}

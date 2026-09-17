import { VideoRequestManager } from '@/components/admin/VideoRequestManager';

export default function AdminVideoRequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Video Solve Requests</h1>
      <p className="text-gray-500 text-sm mb-8">
        Plus and Pro students' requests for a personal video walkthrough. Record an unlisted YouTube video and paste
        the link below to mark a request fulfilled.
      </p>
      <VideoRequestManager />
    </div>
  );
}

import {
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceCard,
  WorkspaceEmptyState,
} from "../../../shared/components/WorkspaceUI.jsx";

export default function CitizenMeetingFiles() {
  return (
    <WorkspacePage width={1120}>
      <WorkspaceSectionHeader
        eyebrow="DEO Workspace"
        title="Citizen Meeting Files"
        subtitle="Access and review citizen meeting documents and files."
      />
      <WorkspaceEmptyState title="No citizen meeting files available." />
    </WorkspacePage>
  );
}

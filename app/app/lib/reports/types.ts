export type Period = {
  kind: "custom";
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
};

export type ReportTemplate = {
  templateId: string;
  title: string;
  description?: string;
};

export type ReportSnapshot = {
  kpis: Array<any>;
  insights: Array<any>;
  risks: Array<any>;
  priorities: Array<any>;
  meta: {
    channels: string[];
    metrics: string[];
  };
};

export type ReportInstance = {
  reportId: string;
  templateId: string;
  createdAt: string;
  period: Period;

  selectedChannels: string[];
  selectedMetrics: string[];

  humanLabel: string;
  dataSnapshot: ReportSnapshot;
};

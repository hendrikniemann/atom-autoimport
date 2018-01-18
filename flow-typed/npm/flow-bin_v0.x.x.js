// flow-  declare typed signature: 6a5610678d4b01e13bbfbbc62bdaf583
// flow-  declare typed version: 3817bc6980/flow-bin_v0.x.x/flow_>=v0.25.x

declare module 'flow-bin' {
  declare type FlowReport = {
    flowVersion: string,
    errors: ErrorReport[],
  };

  declare type ErrorReport = {
    kind: 'infer' | 'parse' | string,
    level: 'error' | 'warning',
    suppressions: any[],
    message: Message[],
    extra?: ExtraReport[],
  };

  declare type ExtraReport = {
    message: Message[],
    children?: ExtraReport[],
  };

  declare type Message = BlameMessage | CommentMessage;

  declare type BlameMessage = {
    type: 'Blame',
    descr: string,
    context: string,
    line: number,
    endline: number,
    path: string,
    start: number,
    end: number,
  };

  declare type CommentMessage = {
    type: 'Comment',
    descr: string,
    context: null,
    line: number,
    endline: number,
    path: string,
    start: number,
    end: number,
  };

  declare module.exports: string;
}

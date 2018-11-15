module tf.toco_command.op {
  import CompatibilityProvider = tf.graph.op.CompatibilityProvider;
  import OpNode = tf.graph.OpNode;

  export class TfLiteCompatibilityProvider implements CompatibilityProvider {
    private _whitelist: String[];

    constructor(whitelist: String[]) {
      this._whitelist = whitelist;
    }

    opValid(opNode: OpNode): boolean {
      return !this._whitelist || this._whitelist.indexOf(opNode.op) != -1;
    }
  }
}
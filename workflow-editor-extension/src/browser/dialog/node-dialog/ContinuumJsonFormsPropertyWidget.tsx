import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { JsonForms } from '@jsonforms/react';
import { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonFormsStyleContext, vanillaCells, vanillaRenderers } from '@jsonforms/vanilla-renderers';
import { JsonFormsPropertyViewWidget } from '@eclipse-emfcloud/jsonforms-property-view/lib/browser/widget';
import CodeEditorControl, { codeEditorTester } from '../../components/node-dialog/CodeEditorRenderer';
import CredentialControl, { credentialTester } from '../../components/node-dialog/CredentialRenderer';

const customRenderers = [
    { tester: codeEditorTester, renderer: CodeEditorControl },
    { tester: credentialTester, renderer: CredentialControl },
    ...vanillaRenderers,
];

@injectable()
export default class ContinuumJsonFormsPropertyWidget extends JsonFormsPropertyViewWidget {
    protected override renderForms(properties: Object | undefined, typeSchema: JsonSchema | undefined, uiSchema: UISchemaElement | undefined): void {
        this.hostRoot.render(
            <JsonFormsStyleContext.Provider value={this.getStyleContext()}>
                <JsonForms
                    data={properties}
                    schema={typeSchema}
                    uischema={uiSchema}
                    cells={vanillaCells}
                    renderers={customRenderers}
                    onChange={this.jsonFormsOnChange}
                />
            </JsonFormsStyleContext.Provider>
        );
    }
}

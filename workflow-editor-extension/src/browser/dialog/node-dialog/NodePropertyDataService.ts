import { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonFormsPropertyDataService } from '@eclipse-emfcloud/jsonforms-property-view/lib/browser/property-data-service';
import { Node } from 'reactflow';
import { IBaseNodeData } from '@continuum/core';

export default class NodePropertyDataService implements JsonFormsPropertyDataService {
    readonly id = 'continuum-node-properties';
    readonly label = 'Continuum Node Properties';

    canHandleSelection(_selection: Object | undefined): number {
        return 1;
    }

    async providePropertyData(selection: Object | undefined): Promise<Object | undefined> {
        return (selection as Node<IBaseNodeData> | undefined)?.data.properties ?? {};
    }

    async getSchema(selection: Object | undefined): Promise<JsonSchema | undefined> {
        return (selection as Node<IBaseNodeData> | undefined)?.data.propertiesSchema ?? {};
    }

    async getUiSchema(selection: Object | undefined): Promise<UISchemaElement | undefined> {
        return (selection as Node<IBaseNodeData> | undefined)?.data.propertiesUISchema;
    }
}

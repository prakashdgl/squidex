/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Squidex UG (haftungsbeschränkt). All rights reserved.
 */

// tslint:disable:prefer-for-of

import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
    AppLanguageDto,
    AppsState,
    ContentDto,
    ContentsService,
    FieldDto,
    ImmutableArray,
    MathHelper,
    ModalView,
    SchemaDetailsDto,
    SchemasService,
    Types
} from '@app/shared';

export const SQX_REFERENCES_EDITOR_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ReferencesEditorComponent), multi: true
};

@Component({
    selector: 'sqx-references-editor',
    styleUrls: ['./references-editor.component.scss'],
    templateUrl: './references-editor.component.html',
    providers: [
        SQX_REFERENCES_EDITOR_CONTROL_VALUE_ACCESSOR
    ]
})
export class ReferencesEditorComponent implements ControlValueAccessor, OnInit {
    private callChange = (v: any) => { /* NOOP */ };
    private callTouched = () => { /* NOOP */ };

    @Input()
    public schemaId: string;

    @Input()
    public language: AppLanguageDto;

    public selectorModal = new ModalView();

    public schema: SchemaDetailsDto;
    public schemaFields: FieldDto[];

    public contentItems = ImmutableArray.empty<ContentDto>();

    public isDisabled = false;
    public isInvalidSchema = false;

    constructor(
        private readonly appsState: AppsState,
        private readonly contentsService: ContentsService,
        private readonly schemasService: SchemasService
    ) {
    }

    public ngOnInit() {
        if (this.schemaId === MathHelper.EMPTY_GUID) {
            return;
        }

        this.schemasService.getSchema(this.appsState.appName, this.schemaId)
            .subscribe(dto => {
                this.schema = dto;

                this.loadFields();
            }, error => {
                this.isInvalidSchema = true;
            });
    }

    public writeValue(value: string[]) {
        this.contentItems = ImmutableArray.empty<ContentDto>();

        if (Types.isArrayOfString(value) && value.length > 0) {
            const contentIds: string[] = value;

            this.contentsService.getContents(this.appsState.appName, this.schemaId, 10000, 0, undefined, contentIds)
                .subscribe(dtos => {
                    this.contentItems = ImmutableArray.of(contentIds.map(id => dtos.items.find(c => c.id === id)).filter(r => !!r).map(r => r!));
                });
        }
    }

    public setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    public registerOnChange(fn: any) {
        this.callChange = fn;
    }

    public registerOnTouched(fn: any) {
        this.callTouched = fn;
    }

    public onContentsSelected(contents: ContentDto[]) {
        for (let content of contents) {
            this.contentItems = this.contentItems.push(content);
        }

        if (contents.length > 0) {
            this.updateValue();
        }

        this.selectorModal.hide();
    }

    public onContentRemoving(content: ContentDto) {
        if (content) {
            this.contentItems = this.contentItems.remove(content);

            this.updateValue();
        }
    }

    public onContentsSorted(contents: ContentDto[]) {
        if (contents) {
            this.contentItems = ImmutableArray.of(contents);

            this.updateValue();
        }
    }

    private updateValue() {
        let ids: string[] | null = this.contentItems.values.map(x => x.id);

        if (ids.length === 0) {
            ids = null;
        }

        this.callTouched();
        this.callChange(ids);
    }

    private loadFields() {
        this.schemaFields = this.schema.fields.filter(x => x.properties.isListField);

        if (this.schemaFields.length === 0 && this.schema.fields.length > 0) {
            this.schemaFields = [this.schema.fields[0]];
        }

        if (this.schemaFields.length === 0) {
            this.schemaFields = [<any>{}];
        }
    }
}
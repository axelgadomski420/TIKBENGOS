import { Injectable } from '@angular/core';
import { EventCategory } from '../models/admin-events.models';
import { EventFormModel, EventFormSchemaField } from './ai-description.service';

export type CategoryRuleProfile = 'default' | 'competition' | 'contest';

export interface CategoryValidationRule {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'textarea' | 'number' | 'datetime';
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  defaultValue?: unknown;
  placeholder?: string | null;
  helperText?: string | null;
  order: number;
}

export interface CategoryRuleSet {
  profile: CategoryRuleProfile;
  extraFields: EventFormSchemaField[];
  requiredKeys: string[];
  defaults: EventFormModel;
}

@Injectable({ providedIn: 'root' })
export class CategoryRuleEngineService {
  private readonly managedProfiles: CategoryRuleProfile[] = ['competition', 'contest'];

  resolve(categoryId: number | null, categories: EventCategory[]): CategoryRuleSet {
    const category = categories.find((item) => item.id === categoryId) ?? null;
    const profile = this.resolveProfile(category);
    const definitions = this.getDefinitions(profile);

    return {
      profile,
      extraFields: definitions.map((definition) => this.toSchemaField(definition)),
      requiredKeys: definitions.filter((definition) => definition.required).map((definition) => definition.key),
      defaults: definitions.reduce<EventFormModel>((accumulator, definition) => {
        accumulator[definition.key] = definition.defaultValue ?? '';
        return accumulator;
      }, {})
    };
  }

  getManagedFieldKeys(): string[] {
    return [...new Set(this.managedProfiles.flatMap((profile) => this.getDefinitions(profile).map((definition) => definition.key)))];
  }

  private resolveProfile(category: EventCategory | null): CategoryRuleProfile {
    const normalizedName = (category?.name ?? '').trim().toLowerCase();

    if (normalizedName.includes('contest')) {
      return 'contest';
    }

    if (normalizedName.includes('competition') || !!category?.competitionMode || !!category?.requiresApproval) {
      return 'competition';
    }

    return 'default';
  }

  private getDefinitions(profile: CategoryRuleProfile): CategoryValidationRule[] {
    if (profile === 'competition') {
      return [
        {
          key: 'scoringCriteria',
          label: 'Scoring criteria',
          required: true,
          type: 'textarea',
          minLength: 20,
          maxLength: 1200,
          defaultValue: '',
          placeholder: 'Explain the scoring dimensions, weightings, and tie-break logic.',
          helperText: 'Define the measurable criteria used to rank participants.',
          order: 65
        },
        {
          key: 'judgeRequirements',
          label: 'Judge requirements',
          required: true,
          type: 'textarea',
          minLength: 20,
          maxLength: 1200,
          defaultValue: '',
          placeholder: 'Describe judge qualifications, neutrality, and availability requirements.',
          helperText: 'List who can judge and the governance requirements for the panel.',
          order: 66
        },
        {
          key: 'judgesCount',
          label: 'Number of judges',
          required: true,
          type: 'number',
          min: 1,
          max: 50,
          defaultValue: 3,
          helperText: 'Set the minimum judging panel size for the event.',
          order: 67
        }
      ];
    }

    if (profile === 'contest') {
      return [
        {
          key: 'scoringCriteria',
          label: 'Scoring criteria',
          required: true,
          type: 'textarea',
          minLength: 20,
          maxLength: 1200,
          defaultValue: '',
          placeholder: 'Describe the evaluation rubric and decision policy.',
          helperText: 'Explain how entries will be scored and ranked.',
          order: 65
        },
        {
          key: 'judgeRequirements',
          label: 'Judge requirements',
          required: true,
          type: 'textarea',
          minLength: 20,
          maxLength: 1200,
          defaultValue: '',
          placeholder: 'Define reviewer or jury qualifications for the contest.',
          helperText: 'Specify who evaluates submissions and the expected review standards.',
          order: 66
        },
        {
          key: 'submissionDeadline',
          label: 'Submission deadline',
          required: true,
          type: 'datetime',
          defaultValue: null,
          helperText: 'Set the final date and time for accepting contest entries.',
          order: 67
        }
      ];
    }

    return [];
  }

  private toSchemaField(definition: CategoryValidationRule): EventFormSchemaField {
    return {
      key: definition.key,
      sectionId: 'general',
      label: definition.label,
      type: definition.type,
      required: definition.required,
      defaultValue: definition.defaultValue ?? '',
      placeholder: definition.placeholder ?? null,
      helperText: definition.helperText ?? null,
      order: definition.order,
      min: definition.min ?? null,
      max: definition.max ?? null,
      step: definition.type === 'number' ? 1 : null,
      minLength: definition.minLength ?? null,
      maxLength: definition.maxLength ?? null,
      dependsOn: null,
      visibleWhen: null,
      optionsSource: null
    };
  }
}

import type { ItemId, Ticket, TicketCategory, TicketHint, ValidationCriteria } from '../types/game';

export type TicketTemplateVariables = Record<string, string | number | boolean | null | undefined>;
export type TicketTemplateValue = string | number | boolean | null | undefined | TicketTemplateValue[] | { [key: string]: TicketTemplateValue };

export type TicketTemplate = Omit<Ticket, 'status'>;

export interface ProceduralTicketGeneratorOptions {
  templates: TicketTemplate[];
  random?: () => number;
}

export interface GenerateTicketRequest {
  category?: TicketCategory;
  difficulty?: Ticket['difficulty'];
  variables?: TicketTemplateVariables;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function substituteTemplateString(source: string, variables: TicketTemplateVariables): string {
  return source.replace(PLACEHOLDER_PATTERN, (_, key: string) => {
    const replacement = variables[key];
    return replacement === undefined || replacement === null ? '' : String(replacement);
  });
}

export function resolveTemplateValue<T>(value: T, variables: TicketTemplateVariables): T {
  if (typeof value === 'string') {
    return substituteTemplateString(value, variables) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveTemplateValue(entry, variables)) as T;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveTemplateValue(entry, variables)]),
    ) as T;
  }

  return value;
}

export function instantiateTicketTemplate(
  template: TicketTemplate,
  variables: TicketTemplateVariables = {},
  sequence = 1,
): Ticket {
  const resolvedTemplate = resolveTemplateValue(template, variables);
  const ticketId = `${resolvedTemplate.id}-${String(sequence).padStart(3, '0')}`;

  return {
    ...resolvedTemplate,
    id: ticketId,
    status: 'available',
  };
}

function selectMatchingTemplates(templates: TicketTemplate[], request: GenerateTicketRequest): TicketTemplate[] {
  const { category, difficulty } = request;

  if (category !== undefined && difficulty !== undefined) {
    const exactMatches = templates.filter((template) => template.category === category && template.difficulty === difficulty);
    if (exactMatches.length > 0) {
      return exactMatches;
    }
  }

  if (category !== undefined) {
    const categoryMatches = templates.filter((template) => template.category === category);
    if (categoryMatches.length > 0) {
      return categoryMatches;
    }
  }

  if (difficulty !== undefined) {
    const difficultyMatches = templates.filter((template) => template.difficulty === difficulty);
    if (difficultyMatches.length > 0) {
      return difficultyMatches;
    }
  }

  return templates;
}

export function createProceduralTicketGenerator({ templates, random = Math.random }: ProceduralTicketGeneratorOptions) {
  let sequence = 1;

  return {
    generateTicket(request: GenerateTicketRequest = {}): Ticket {
      if (templates.length === 0) {
        throw new Error('Cannot generate a ticket without templates.');
      }

      const matchingTemplates = selectMatchingTemplates(templates, request);
      const index = Math.min(
        matchingTemplates.length - 1,
        Math.floor(random() * matchingTemplates.length),
      );
      const selectedTemplate = matchingTemplates[index];

      return instantiateTicketTemplate(selectedTemplate, request.variables, sequence++);
    },
  };
}

export function createTicketTemplateId(templateId: string, suffix: number): string {
  return `${templateId}-${String(suffix).padStart(3, '0')}`;
}

export function hasTicketTemplateVariables(value: unknown): value is TicketTemplateVariables {
  return isRecord(value);
}

export function collectTicketTemplateIds(templates: TicketTemplate[]): string[] {
  return templates.map((template) => template.id);
}

export function withTemplateVariables<T extends TicketTemplateValue>(value: T, variables: TicketTemplateVariables): T {
  return resolveTemplateValue(value, variables);
}

export function createTemplateHints(hints: TicketHint[], variables: TicketTemplateVariables): TicketHint[] {
  return hints.map((hint) => ({
    ...hint,
    text: substituteTemplateString(hint.text, variables),
    revealed: hint.revealed,
  }));
}

export function createTemplateValidation(validation: ValidationCriteria[], variables: TicketTemplateVariables): ValidationCriteria[] {
  return validation.map((criterion) => ({
    ...criterion,
    params: resolveTemplateValue(criterion.params, variables),
  }));
}

export function createTemplateRequiredItems(items: ItemId[] | undefined, variables: TicketTemplateVariables): ItemId[] | undefined {
  if (!items) {
    return undefined;
  }

  return resolveTemplateValue(items, variables);
}

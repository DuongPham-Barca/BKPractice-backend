import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

import {
  assertArray,
  assertEnumValue,
  assertTrimmedNonEmpty,
  assertUniqueValues,
  freezeArray,
} from './value-object.utils';

export const OOP_STRUCTURES = ['CLASS', 'INTERFACE'] as const;
export type OopStructure = (typeof OOP_STRUCTURES)[number];

export const OOP_ACCESSES = ['PUBLIC', 'PROTECTED', 'PRIVATE'] as const;
export type OopAccess = (typeof OOP_ACCESSES)[number];

export interface FunctionParameter {
  readonly name: string;
  readonly type: string;
}

export interface FunctionContractProps {
  readonly functionName: string;
  readonly parameters: readonly FunctionParameter[];
  readonly returnType: string;
}

export class FunctionContract {
  readonly functionName: string;
  readonly parameters: readonly FunctionParameter[];
  readonly returnType: string;

  constructor(props: FunctionContractProps) {
    this.functionName = assertTrimmedNonEmpty(props.functionName, 'functionName');
    this.parameters = normalizeParameters(props.parameters, 'parameters');
    this.returnType = assertTrimmedNonEmpty(props.returnType, 'returnType');
    Object.freeze(this);
  }
}

export interface OopParameter {
  readonly name: string;
  readonly type: string;
}

export interface OopConstructor {
  readonly access: OopAccess;
  readonly parameters: readonly OopParameter[];
}

export interface OopMethod {
  readonly name: string;
  readonly access: OopAccess;
  readonly parameters: readonly OopParameter[];
  readonly returnType: string;
}

export interface OopContractProps {
  readonly structure: string;
  readonly name: string;
  readonly constructorContract?: OopConstructor | null;
  readonly methods: readonly OopMethod[];
}

export class OopContract {
  readonly structure: OopStructure;
  readonly name: string;
  readonly constructorContract: OopConstructor | null;
  readonly methods: readonly OopMethod[];

  constructor(props: OopContractProps) {
    this.structure = assertEnumValue(props.structure, OOP_STRUCTURES, 'structure');
    this.name = assertTrimmedNonEmpty(props.name, 'name');

    assertArray(props.methods, 'methods');

    if (this.structure === 'INTERFACE' && props.constructorContract != null) {
      throw new DomainValidationError(
        'constructorContract',
        'an interface must not have a constructor contract',
      );
    }

    this.constructorContract =
      props.constructorContract == null
        ? null
        : normalizeOopConstructor(props.constructorContract, 'constructorContract');

    const methods = props.methods.map((method, index) =>
      normalizeOopMethod(method, `methods[${index}]`),
    );
    assertUniqueValues(
      methods.map((method) => method.name),
      'methods.name',
    );

    this.methods = freezeArray(methods);
    Object.freeze(this);
  }
}

function normalizeParameters(
  parameters: readonly FunctionParameter[],
  field: string,
): readonly FunctionParameter[] {
  assertArray(parameters, field);

  const normalized = parameters.map((parameter) =>
    Object.freeze({
      name: assertTrimmedNonEmpty(parameter.name, `${field}.name`),
      type: assertTrimmedNonEmpty(parameter.type, `${field}.type`),
    }),
  );

  assertUniqueValues(
    normalized.map((parameter) => parameter.name),
    `${field}.name`,
  );

  return freezeArray(normalized);
}

function normalizeOopConstructor(value: OopConstructor, field: string): OopConstructor {
  return Object.freeze({
    access: assertEnumValue(value.access, OOP_ACCESSES, `${field}.access`),
    parameters: normalizeParameters(value.parameters, `${field}.parameters`),
  });
}

function normalizeOopMethod(value: OopMethod, field: string): OopMethod {
  return Object.freeze({
    name: assertTrimmedNonEmpty(value.name, `${field}.name`),
    access: assertEnumValue(value.access, OOP_ACCESSES, `${field}.access`),
    parameters: normalizeParameters(value.parameters, `${field}.parameters`),
    returnType: assertTrimmedNonEmpty(value.returnType, `${field}.returnType`),
  });
}

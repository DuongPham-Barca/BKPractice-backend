import type { SupportedLanguage } from '@app/contracts';

import type { Problem } from '../problem.aggregate';
import { OOP_ACCESSES } from '../value-objects';
import type { OopContract } from '../value-objects';

export interface PublishIssue {
  readonly code: string;
  readonly field?: string;
  readonly message: string;
}

export class ProblemContractValidator {
  validate(problem: Problem): readonly PublishIssue[] {
    const issues: PublishIssue[] = [];
    const enabledLanguages = new Set(problem.enabledLanguages.map((language) => language.value));
    const starterLanguages = new Set(
      problem.starterCodes.map((starterCode) => starterCode.language),
    );

    if (problem.problemType === 'STANDARD') {
      if (problem.inputSpecification === null) {
        issues.push({
          code: 'STANDARD_IO_REQUIRED',
          field: 'inputSpecification',
          message: 'A STANDARD problem requires input specification',
        });
      }

      if (problem.outputSpecification === null) {
        issues.push({
          code: 'STANDARD_IO_REQUIRED',
          field: 'outputSpecification',
          message: 'A STANDARD problem requires output specification',
        });
      }

      if (problem.functionContracts.size > 0) {
        issues.push({
          code: 'STANDARD_CONTRACT_NOT_ALLOWED',
          field: 'functionContracts',
          message: 'A STANDARD problem must not have function contracts',
        });
      }

      if (problem.oopContracts.size > 0) {
        issues.push({
          code: 'STANDARD_CONTRACT_NOT_ALLOWED',
          field: 'oopContracts',
          message: 'A STANDARD problem must not have oop contracts',
        });
      }
    }

    if (problem.problemType === 'FUNCTION') {
      if (problem.oopContracts.size > 0) {
        issues.push({
          code: 'OOP_CONTRACT_NOT_ALLOWED',
          field: 'oopContracts',
          message: 'A FUNCTION problem must not have oop contracts',
        });
      }

      for (const language of enabledLanguages) {
        if (!problem.functionContracts.has(language)) {
          issues.push({
            code: 'FUNCTION_CONTRACT_MISSING',
            field: `functionContracts.${language}`,
            message: `A FUNCTION problem requires a function contract for ${language}`,
          });
        }

        if (!starterLanguages.has(language)) {
          issues.push({
            code: 'STARTER_CODE_MISSING',
            field: `starterCodes.${language}`,
            message: `A FUNCTION problem requires starter code for ${language}`,
          });
        }
      }
    }

    if (problem.problemType === 'OOP') {
      if (problem.functionContracts.size > 0) {
        issues.push({
          code: 'FUNCTION_CONTRACT_NOT_ALLOWED',
          field: 'functionContracts',
          message: 'An OOP problem must not have function contracts',
        });
      }

      for (const language of enabledLanguages) {
        const contract = problem.oopContracts.get(language);

        if (contract === undefined) {
          issues.push({
            code: 'OOP_CONTRACT_MISSING',
            field: `oopContracts.${language}`,
            message: `An OOP problem requires an oop contract for ${language}`,
          });
        } else {
          issues.push(...this.validateOopContract(language, contract));
        }

        if (!starterLanguages.has(language)) {
          issues.push({
            code: 'STARTER_CODE_MISSING',
            field: `starterCodes.${language}`,
            message: `An OOP problem requires starter code for ${language}`,
          });
        }
      }
    }

    for (const language of problem.functionContracts.keys()) {
      if (!enabledLanguages.has(language)) {
        issues.push({
          code: 'CONTRACT_LANGUAGE_DISABLED',
          field: `functionContracts.${language}`,
          message: `Function contract language ${language} is not enabled`,
        });
      }
    }

    for (const language of problem.oopContracts.keys()) {
      if (!enabledLanguages.has(language)) {
        issues.push({
          code: 'CONTRACT_LANGUAGE_DISABLED',
          field: `oopContracts.${language}`,
          message: `OOP contract language ${language} is not enabled`,
        });
      }
    }

    for (const starterCode of problem.starterCodes) {
      if (!enabledLanguages.has(starterCode.language)) {
        issues.push({
          code: 'STARTER_CODE_LANGUAGE_DISABLED',
          field: `starterCodes.${starterCode.language}`,
          message: `Starter code language ${starterCode.language} is not enabled`,
        });
      }
    }

    if (enabledLanguages.size === 0) {
      issues.push({
        code: 'ENABLED_LANGUAGE_REQUIRED',
        field: 'enabledLanguages',
        message: 'At least one language must be enabled',
      });
    }

    return issues;
  }

  private validateOopContract(
    language: SupportedLanguage,
    contract: OopContract,
  ): readonly PublishIssue[] {
    const issues: PublishIssue[] = [];
    const field = `oopContracts.${language}`;

    if (contract.structure === 'INTERFACE' && contract.constructorContract !== null) {
      issues.push({
        code: 'PROBLEM_TYPE_CONFIG_MISMATCH',
        field: `${field}.constructorContract`,
        message: 'An interface must not have a constructor contract',
      });
    }

    const methodNames = new Set<string>();

    for (const method of contract.methods) {
      if (methodNames.has(method.name)) {
        issues.push({
          code: 'PROBLEM_TYPE_CONFIG_MISMATCH',
          field: `${field}.methods`,
          message: `Duplicate method name ${method.name}`,
        });
      }

      methodNames.add(method.name);

      if (!(OOP_ACCESSES as readonly string[]).includes(method.access)) {
        issues.push({
          code: 'PROBLEM_TYPE_CONFIG_MISMATCH',
          field: `${field}.methods.${method.name}.access`,
          message: `Invalid method access ${method.access}`,
        });
      }

      const parameterNames = new Set<string>();

      for (const parameter of method.parameters) {
        if (parameterNames.has(parameter.name)) {
          issues.push({
            code: 'PROBLEM_TYPE_CONFIG_MISMATCH',
            field: `${field}.methods.${method.name}.parameters`,
            message: `Duplicate parameter name ${parameter.name}`,
          });
        }

        parameterNames.add(parameter.name);
      }
    }

    return issues;
  }
}
